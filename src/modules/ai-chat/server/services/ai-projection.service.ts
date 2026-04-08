import type { Interaction } from "@prisma/client";
import { buildAIProjection } from "./projection.service";
import { processFileAttachments } from "./file.service";
import type { ChatUIMessage } from "../../types/message";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ai-projection-service");

export interface DocumentProcessingResult {
  filename: string;
  sourceUrl: string;
  markdown: string;
  status: "loading" | "completed" | "failed";
  pageCount?: number;
  error?: string;
}

/**
 * Process file attachments in the last message
 */
export async function processLastMessageFiles(
  lastMessage: ChatUIMessage | undefined,
  conversationId: string,
): Promise<DocumentProcessingResult[]> {
  if (lastMessage?.role !== "user") {
    return [];
  }

  const fileParts = lastMessage.parts.filter(
    (p) => typeof p === "object" && p !== null && "type" in p && p.type === "file"
  );

  if (fileParts.length === 0) {
    return [];
  }

  logger.info({ conversationId, fileCount: fileParts.length }, "Processing file attachments");

  const results = await processFileAttachments(
    fileParts
      .map((p) => {
        if (typeof p === "object" && p !== null && "url" in p) {
          return {
            url: String(p.url),
            filename: "filename" in p && p.filename != null ? String(p.filename) : undefined,
            mediaType: "mediaType" in p ? String(p.mediaType) : "application/octet-stream",
          };
        }
        return { url: "", filename: "", mediaType: "" };
      })
      .filter((f) => f.url)
  );

  logger.info({ conversationId, documentCount: results.length }, "File processing completed");

  return results;
}

/**
 * Build AI projection with enhanced content
 */
export function buildEnhancedAIProjection(
  interactions: Interaction[],
  loadedMessageIds: Set<string>,
  lastMessage: ChatUIMessage | undefined,
  documentProcessingResults: DocumentProcessingResult[],
  agentId?: string,
): ChatUIMessage[] {
  // Filter interactions to only include those in loadedMessages
  const filteredInteractions = interactions.filter(
    (i) =>
      loadedMessageIds.has(i.id) || // Include messages in loaded history
      (i.type === "document_processing" && i.correlationId && loadedMessageIds.has(i.correlationId)) // Include their documents
  );

  const messagesForAI = buildAIProjection(filteredInteractions);

  // Add the new user message with enhanced content
  if (lastMessage?.role === "user") {
    const textParts = lastMessage.parts.filter(
      (p) => typeof p === "object" && p !== null && "type" in p && p.type === "text"
    );
    const imageParts = lastMessage.parts.filter((p) => {
      if (
        typeof p === "object" &&
        p !== null &&
        "mediaType" in p &&
        "type" in p &&
        p.type === "file"
      ) {
        const mediaType = String(p.mediaType);
        return mediaType.startsWith("image/");
      }
      return false;
    });

    // Extract user text
    let userText = textParts
      .map((p) => {
        if (typeof p === "object" && p !== null && "text" in p) {
          return String(p.text);
        }
        return "";
      })
      .join("\n");

    // Append document markdown to text
    for (const doc of documentProcessingResults) {
      if (doc.status === "completed" && doc.markdown) {
        userText += "\n\n---\n";
        userText += `Document: ${doc.filename}\n\n`;
        userText += doc.markdown;
        userText += "\n---";
      }
    }

    // For ecommerce agent, append image URLs to text
    if (agentId === "agent_ecommerce_video" && imageParts.length > 0) {
      userText += "\n\n";
      imageParts.forEach((p, index) => {
        if (typeof p === "object" && p !== null && "url" in p) {
          const url = String(p.url);
          userText += `Product Image ${index + 1}: ${url}\n`;
        }
      });
    }

    // Build enhanced message for AI
    const partsForAI: Array<
      | { type: "text"; text: string }
      | { type: "file"; url: string; mediaType: string; filename?: string }
    > = [
      { type: "text", text: userText },
      ...imageParts.map((p) => ({
        type: "file" as const,
        url: (p as { url?: string }).url ?? "",
        mediaType: (p as { mediaType?: string }).mediaType ?? "",
        filename: (p as { filename?: string }).filename,
      })),
    ];

    const existingCreatedAt =
      lastMessage.metadata &&
      typeof lastMessage.metadata === "object" &&
      "createdAt" in lastMessage.metadata &&
      lastMessage.metadata.createdAt instanceof Date
        ? lastMessage.metadata.createdAt
        : new Date();

    messagesForAI.push({
      id: lastMessage.id,
      role: "user",
      parts: partsForAI,
      metadata: {
        createdAt: existingCreatedAt,
      },
    });
  }

  return messagesForAI;
}

