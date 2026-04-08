import { db } from "../../../../server/db";
import {
  InteractionType,
  type DocumentProcessingData,
} from "../../types/interaction";
import { Prisma } from "@prisma/client";

/**
 * Get the last interaction ID in a conversation (for setting parentId)
 */
async function getLastInteractionId(conversationId: string): Promise<string | null> {
  // First check activeInteractionId
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { activeInteractionId: true },
  });

  if (conversation?.activeInteractionId) {
    return conversation.activeInteractionId;
  }

  // Fallback to most recent interaction
  const lastInteraction = await db.interaction.findFirst({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return lastInteraction?.id ?? null;
}

/**
 * Create a user message interaction
 */
export async function createUserMessageInteraction(
  conversationId: string,
  userAgentId: string,
  parts: unknown[],
  metadata?: Record<string, unknown>,
  options?: {
    interactionId?: string;
    parentId?: string | null;
    updateActiveInteraction?: boolean;
  },
) {
  // Determine parentId
  let parentId = options?.parentId;
  if (parentId === undefined) {
    parentId = await getLastInteractionId(conversationId);
  }

  const interaction = await db.interaction.create({
    data: {
      ...(options?.interactionId && { id: options.interactionId }),
      conversationId,
      userAgentId,
      type: InteractionType.USER_MESSAGE,
      parts: parts as Prisma.InputJsonValue,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      correlationId: null,
      parentId,
    },
  });

  // Update activeInteractionId if requested (default: true)
  if (options?.updateActiveInteraction !== false) {
    await db.conversation.update({
      where: { id: conversationId },
      data: { activeInteractionId: interaction.id },
    });
  }

  return interaction;
}

/**
 * Create an AI message interaction
 */
export async function createAIMessageInteraction(
  conversationId: string,
  userAgentId: string,
  parts: unknown[],
  metadata?: Record<string, unknown>,
  options?: {
    interactionId?: string;
    parentId?: string | null;
    updateActiveInteraction?: boolean;
  },
) {
  // Determine parentId
  let parentId = options?.parentId;
  if (parentId === undefined) {
    parentId = await getLastInteractionId(conversationId);
  }

  const interaction = await db.interaction.create({
    data: {
      ...(options?.interactionId && { id: options.interactionId }),
      conversationId,
      userAgentId,
      type: InteractionType.AI_MESSAGE,
      parts: parts as Prisma.InputJsonValue,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      correlationId: null,
      parentId,
    },
  });

  // Update activeInteractionId if requested (default: true)
  if (options?.updateActiveInteraction !== false) {
    await db.conversation.update({
      where: { id: conversationId },
      data: { activeInteractionId: interaction.id },
    });
  }

  return interaction;
}

/**
 * Create a document processing interaction
 */
export async function createDocumentProcessingInteraction(
  conversationId: string,
  userAgentId: string,
  correlationId: string,
  data: DocumentProcessingData,
) {
  return db.interaction.create({
    data: {
      conversationId,
      userAgentId,
      type: InteractionType.DOCUMENT_PROCESSING,
      parts: [
        {
          type: "data-documentProcessing",
          data,
        },
      ] as unknown as Prisma.InputJsonValue,
      metadata: Prisma.JsonNull,
      correlationId,
    },
  });
}

/**
 * Load all interactions for a conversation
 */
export async function loadConversationInteractions(conversationId: string) {
  return db.interaction.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Load interactions for UI (user_message + ai_message only)
 */
export async function loadUIInteractions(conversationId: string) {
  return db.interaction.findMany({
    where: {
      conversationId,
      type: {
        in: [InteractionType.USER_MESSAGE, InteractionType.AI_MESSAGE],
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Find document processing interactions by correlation ID
 */
export async function findDocumentProcessingByCorrelation(
  correlationId: string,
) {
  return db.interaction.findMany({
    where: {
      type: InteractionType.DOCUMENT_PROCESSING,
      correlationId,
    },
  });
}

