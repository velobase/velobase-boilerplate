/**
 * Support Conversation Service
 * 
 * 管理 SupportTicket 与 Conversation 的关联
 * 使用 Event Sourcing 模式存储 AI 对话历史
 */

import { db } from "@/server/db";
import { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

/**
 * 为 SupportTicket 创建或获取 Conversation
 */
export async function getOrCreateConversation(ticketId: string): Promise<string> {
  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    select: { 
      id: true,
      conversationId: true, 
      userId: true,
      subject: true,
    },
  });

  if (!ticket) {
    throw new Error(`Ticket not found: ${ticketId}`);
  }

  // 如果已有 conversation，直接返回
  if (ticket.conversationId) {
    return ticket.conversationId;
  }

  // 创建新的 conversation
  const conversation = await db.conversation.create({
    data: {
      userId: ticket.userId,
      title: ticket.subject ?? `Support Ticket ${ticketId}`,
      metadata: {
        type: "support_ticket",
        ticketId,
      } as Prisma.InputJsonValue,
    },
  });

  // 关联到 ticket
  await db.supportTicket.update({
    where: { id: ticketId },
    data: { conversationId: conversation.id },
  });

  logger.info(
    { ticketId, conversationId: conversation.id },
    "Created conversation for support ticket"
  );

  return conversation.id;
}

/**
 * 加载 Conversation 的所有 Interactions 并转换为 AI SDK 消息格式
 */
export async function loadConversationHistory(conversationId: string): Promise<unknown[]> {
  const interactions = await db.interaction.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  // 转换为 AI SDK 消息格式
  const messages: unknown[] = [];

  for (const interaction of interactions) {
    const parts = interaction.parts as unknown[];
    
    if (interaction.type === "user_message") {
      messages.push({
        role: "user",
        content: parts,
      });
    } else if (interaction.type === "ai_message") {
      messages.push({
        role: "assistant",
        content: parts,
      });
    }
    // 其他类型（如 tool 结果）会包含在 parts 中
  }

  return messages;
}

/**
 * 保存用户消息到 Conversation
 */
export async function saveUserMessage(
  conversationId: string,
  content: string,
  metadata?: Record<string, unknown>,
): Promise<string> {
  const interaction = await db.interaction.create({
    data: {
      conversationId,
      type: "user_message",
      parts: [{ type: "text", text: content }] as Prisma.InputJsonValue,
      metadata: metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  });

  // 更新 conversation 的 activeInteractionId
  await db.conversation.update({
    where: { id: conversationId },
    data: { activeInteractionId: interaction.id },
  });

  return interaction.id;
}

/**
 * 保存 AI 消息到 Conversation（包括工具调用）
 */
export async function saveAIMessage(
  conversationId: string,
  parts: unknown[],
  metadata?: Record<string, unknown>,
): Promise<string> {
  const interaction = await db.interaction.create({
    data: {
      conversationId,
      type: "ai_message",
      parts: parts as Prisma.InputJsonValue,
      metadata: metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  });

  // 更新 conversation 的 activeInteractionId
  await db.conversation.update({
    where: { id: conversationId },
    data: { activeInteractionId: interaction.id },
  });

  return interaction.id;
}

/**
 * 保存完整的 Agent 步骤到 Conversation
 * 
 * 将 AI SDK 的 steps 转换为 Interaction 记录
 */
export async function saveAgentSteps(
  conversationId: string,
  steps: Array<{
    text: string;
    toolCalls: Array<{
      toolCallId: string;
      toolName: string;
      args: unknown;
    }>;
    toolResults: Array<{
      toolCallId: string;
      result: unknown;
    }>;
  }>,
  finalReply: string,
): Promise<void> {
  // 构建 AI 消息的 parts
  const parts: unknown[] = [];

  // 添加所有步骤中的工具调用和结果
  for (const step of steps) {
    // 添加工具调用
    for (const toolCall of step.toolCalls) {
      parts.push({
        type: "tool-call",
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        args: toolCall.args,
      });
    }

    // 添加工具结果
    for (const toolResult of step.toolResults) {
      parts.push({
        type: "tool-result",
        toolCallId: toolResult.toolCallId,
        result: toolResult.result,
      });
    }
  }

  // 添加最终文本回复
  if (finalReply) {
    parts.push({
      type: "text",
      text: finalReply,
    });
  }

  // 保存为单个 AI 消息
  await saveAIMessage(conversationId, parts, {
    stepsCount: steps.length,
    hasTools: parts.some((p) => (p as { type: string }).type === "tool-call"),
  });

  logger.info(
    { conversationId, partsCount: parts.length, stepsCount: steps.length },
    "Saved agent steps to conversation"
  );
}

