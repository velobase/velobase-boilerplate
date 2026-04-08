import { db } from "@/server/db";
import {
  InteractionType,
  type DocumentProcessingData,
} from "@/types/interaction";
import { Prisma } from "@prisma/client";

/**
 * Create a user message interaction
 */
export async function createUserMessageInteraction(
  conversationId: string,
  parts: unknown[],
  metadata?: Record<string, unknown>,
  userAgentId?: string | null,
) {
  return db.interaction.create({
    data: {
      conversationId,
      type: InteractionType.USER_MESSAGE,
      parts: parts as Prisma.InputJsonValue,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      correlationId: null,
      userAgentId: userAgentId ?? undefined,
    },
  });
}

/**
 * Create an AI message interaction
 */
export async function createAIMessageInteraction(
  conversationId: string,
  parts: unknown[],
  metadata?: Record<string, unknown>,
  userAgentId?: string | null,
) {
  return db.interaction.create({
    data: {
      conversationId,
      type: InteractionType.AI_MESSAGE,
      parts: parts as Prisma.InputJsonValue,
      userAgentId: userAgentId ?? undefined,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      correlationId: null,
    },
  });
}

/**
 * Create a document processing interaction
 */
export async function createDocumentProcessingInteraction(
  conversationId: string,
  correlationId: string,
  data: DocumentProcessingData,
) {
  return db.interaction.create({
    data: {
      conversationId,
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

