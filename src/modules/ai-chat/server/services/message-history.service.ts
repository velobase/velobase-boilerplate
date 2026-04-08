import { loadConversationInteractions } from "./interaction.service";
import { buildUIProjection } from "./projection.service";
import type { ChatUIMessage } from "../../types/message";
import { NotFoundError, BadRequestError } from "../../types/errors";
import { createLogger } from "@/lib/logger";

const logger = createLogger("message-history-service");

export interface MessageHistoryResult {
  messages: ChatUIMessage[];
  loadedMessages: ChatUIMessage[];
  parentInteractionId: string | null;
}

/**
 * Build message history for regenerate trigger
 */
export async function buildRegenerateHistory(
  conversationId: string,
  messageId: string,
): Promise<MessageHistoryResult> {
  const interactions = await loadConversationInteractions(conversationId);

  // Find the interaction to regenerate from
  const anchor = interactions.find((i) => i.id === messageId);
  if (!anchor) {
    throw new NotFoundError("Message not found for regeneration");
  }

  // If regenerating from AI message, use its parent; if from user message, use it directly
  let parentInteractionId: string | null;
  if (anchor.type === "ai_message") {
    parentInteractionId = anchor.parentId;
    if (!parentInteractionId) {
      throw new BadRequestError("AI message has no parent user message");
    }
  } else if (anchor.type === "user_message") {
    parentInteractionId = anchor.id;
  } else {
    throw new BadRequestError("Can only regenerate from user or assistant messages");
  }

  // Build history up to the parent interaction
  // Filter interactions up to parent
  const interactionsUpToParent = interactions.filter((i) => {
    if (i.id === parentInteractionId) return true;
    // Include all interactions that come before the parent in chronological order
    const parentInteraction = interactions.find((x) => x.id === parentInteractionId);
    if (!parentInteraction) return false;
    return i.createdAt <= parentInteraction.createdAt;
  });
  
  const loadedMessages = buildUIProjection(interactionsUpToParent);

  logger.info(
    { conversationId, messageId, parentInteractionId, messageCount: loadedMessages.length },
    "Regenerate: built history up to parent"
  );

  return {
    messages: loadedMessages,
    loadedMessages,
    parentInteractionId,
  };
}

/**
 * Build message history for submit-message trigger
 */
export async function buildSubmitHistory(
  conversationId: string,
  message: ChatUIMessage,
  messageId?: string,
  requestParentId?: string,
  activeInteractionId?: string | null,
): Promise<MessageHistoryResult> {
  const interactions = await loadConversationInteractions(conversationId);

  let parentInteractionId: string | null;
  let loadedMessages: ChatUIMessage[];

  // Check if this is an edit (messageId provided)
  if (messageId) {
    // Edit scenario: find the interaction being edited
    const anchor = interactions.find((i) => i.id === messageId);
    if (!anchor) {
      throw new NotFoundError("Message not found for editing");
    }

    // Build history up to the parent of the edited message
    parentInteractionId = anchor.parentId;
    
    // Filter interactions up to parent
    const interactionsUpToParent = parentInteractionId 
      ? interactions.filter((i) => {
          if (i.id === parentInteractionId) return true;
          const parentInteraction = interactions.find((x) => x.id === parentInteractionId);
          if (!parentInteraction) return false;
          return i.createdAt <= parentInteraction.createdAt;
        })
      : [];
    
    loadedMessages = buildUIProjection(interactionsUpToParent);

    logger.info(
      { conversationId, messageId, parentInteractionId, messageCount: loadedMessages.length },
      "Edit: built history up to parent"
    );
  } else {
    // Normal send: append new message to full history
    // Use explicitly provided parentId (for branch selection), otherwise use activeInteractionId
    parentInteractionId = requestParentId ?? activeInteractionId ?? null;
    
    // Filter interactions up to parent (or all if no parent)
    const interactionsUpToParent = parentInteractionId
      ? interactions.filter((i) => {
          if (i.id === parentInteractionId) return true;
          const parentInteraction = interactions.find((x) => x.id === parentInteractionId);
          if (!parentInteraction) return false;
          return i.createdAt <= parentInteraction.createdAt;
        })
      : interactions;
    
    loadedMessages = buildUIProjection(interactionsUpToParent);

    logger.info(
      {
        conversationId,
        parentInteractionId,
        requestParentId,
        activeInteractionId,
        previousCount: loadedMessages.length,
      },
      "Submit: built history"
    );
  }

  return {
    messages: [...loadedMessages, message],
    loadedMessages,
    parentInteractionId,
  };
}

