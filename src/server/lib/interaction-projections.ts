import type { Interaction } from "@prisma/client";
import type { CustomUIMessage } from "@/types/custom-ui-message";
import { InteractionType } from "@/types/interaction";

/**
 * Build UI projection from interactions
 * Used for frontend display - includes original user input + file attachments + document processing status
 * Returns properly typed CustomUIMessage with metadata.createdAt
 */
export function buildUIProjection(
  interactions: Interaction[],
): CustomUIMessage[] {
  const messages: CustomUIMessage[] = [];

  // Only process message types
  const messageInteractions = interactions.filter(
    (i) =>
      i.type === InteractionType.USER_MESSAGE ||
      i.type === InteractionType.AI_MESSAGE,
  );

  // Get document processing interactions for lookup
  const docProcessings = interactions.filter(
    (i) => i.type === InteractionType.DOCUMENT_PROCESSING,
  );

  for (const interaction of messageInteractions) {
    // Base message structure
    const message: CustomUIMessage = {
      id: interaction.id,
      role: interaction.type === InteractionType.USER_MESSAGE ? "user" : "assistant",
      parts: ((interaction.parts as unknown[]) ?? []) as CustomUIMessage['parts'],
      metadata: {
        createdAt: interaction.createdAt,
        ...(interaction.metadata && typeof interaction.metadata === 'object' ? interaction.metadata as Record<string, unknown> : {}),
      },
    };

    // For user messages, add related document processing status as data parts
    if (interaction.type === InteractionType.USER_MESSAGE) {
      const relatedDocs = docProcessings.filter(
        (doc) => doc.correlationId === interaction.id,
      );

      for (const docProc of relatedDocs) {
        const parts = docProc.parts as unknown[];
        const docData = (parts[0] as { data?: unknown })?.data;

        if (docData && typeof docData === "object") {
          const data = docData as {
            filename?: string;
            status?: string;
            error?: string;
          };

          // Add document processing status as data part
          message.parts.push({
            type: "data-documentProcessing",
            id: docProc.id,
            data: {
              filename: data.filename ?? "",
              status: (data.status as "loading" | "completed" | "failed") ?? "completed",
              error: data.error,
            },
          });
        }
      }
    }

    messages.push(message);
  }

  return messages;
}

/**
 * Build AI projection from interactions
 * Used for sending to LLM - includes enhanced content (user text + document markdown)
 */
export function buildAIProjection(
  interactions: Interaction[],
): CustomUIMessage[] {
  const messagesForAI: CustomUIMessage[] = [];

  // Separate message and document processing interactions
  const messageInteractions = interactions.filter(
    (i) =>
      i.type === InteractionType.USER_MESSAGE ||
      i.type === InteractionType.AI_MESSAGE,
  );
  const docProcessings = interactions.filter(
    (i) => i.type === InteractionType.DOCUMENT_PROCESSING,
  );

  for (const interaction of messageInteractions) {
    if (interaction.type === InteractionType.USER_MESSAGE) {
      // 1. Get original parts
      const parts = (interaction.parts as unknown[]) ?? [];

      // 2. Extract text content
      const textPart = parts.find(
        (p: unknown): p is { type: string; text: string } => 
          typeof p === 'object' && p !== null && 'type' in p && p.type === "text"
      );
      let enhancedText = textPart?.text ?? "";

      // 3. Find related document processing
      const relatedDocs = docProcessings.filter(
        (doc) => doc.correlationId === interaction.id,
      );

      // 4. Append document Markdown to text
      for (const doc of relatedDocs) {
        const docParts = doc.parts as unknown[];
        const docPartData = (docParts[0] as { data?: unknown })?.data;

        if (docPartData && typeof docPartData === "object") {
          const data = docPartData as {
            status?: string;
            markdown?: string;
            filename?: string;
          };

          if (data.status === "completed" && data.markdown) {
            enhancedText += "\n\n---\n";
            enhancedText += `Document: ${data.filename ?? "unknown"}\n\n`;
            enhancedText += data.markdown;
            enhancedText += "\n---";
          }
        }
      }

      // 5. Keep only image FileParts (AI Vision support)
      const imageParts = parts.filter(
        (p: unknown): p is { type: string; mediaType?: string } =>
          typeof p === 'object' && p !== null && 'type' in p && p.type === "file" && 
          'mediaType' in p && typeof p.mediaType === 'string' && p.mediaType.startsWith("image/")
      );

      // 6. Build enhanced message
      messagesForAI.push({
        id: interaction.id,
        role: "user",
        parts: [{ type: "text", text: enhancedText }, ...imageParts] as CustomUIMessage['parts'],
        metadata: {
          createdAt: interaction.createdAt,
        },
      });
    } else if (interaction.type === InteractionType.AI_MESSAGE) {
      // AI messages are kept as-is
      messagesForAI.push({
        id: interaction.id,
        role: "assistant",
        parts: ((interaction.parts as unknown[]) ?? []) as CustomUIMessage['parts'],
        metadata: {
          createdAt: interaction.createdAt,
          ...(interaction.metadata && typeof interaction.metadata === 'object' ? interaction.metadata as Record<string, unknown> : {}),
        },
      });
    }
  }

  return messagesForAI;
}

