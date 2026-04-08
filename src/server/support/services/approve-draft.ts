/**
 * 审核通过/拒绝草稿
 */

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { addSystemEvent } from "./add-event";
import type { DraftMetadata } from "../types";

/**
 * 审核通过草稿
 * 返回需要发送的回复内容和待执行的操作
 */
export async function approveDraft(
  ticketId: string,
  agentId?: string
): Promise<{
  reply: string;
  actions: Array<{ tool: string; args: Record<string, unknown>; description: string }>;
  toEmail: string;
  inReplyTo?: string;
  references?: string;
} | null> {
  // 1. 找到最新的 DRAFT 事件
  const draftEvent = await db.supportTimeline.findFirst({
    where: {
      ticketId,
      type: "DRAFT",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!draftEvent) {
    logger.warn({ ticketId }, "No draft found for approval");
    return null;
  }

  const metadata = draftEvent.metadata as DraftMetadata | null;
  if (!metadata?.proposedReply) {
    logger.warn({ ticketId }, "Draft has no proposed reply");
    return null;
  }

  // 2. 获取工单和用户邮箱
  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    logger.warn({ ticketId }, "Ticket not found");
    return null;
  }

  // 3. 获取原始邮件的 messageId（用于回复线程）
  const originalMessage = await db.supportTimeline.findFirst({
    where: {
      ticketId,
      type: "MESSAGE",
      actor: "USER",
    },
    orderBy: { createdAt: "desc" },
  });

  const emailMeta = originalMessage?.metadata as { messageId?: string; references?: string } | null;

  // 4. 记录审核通过事件
  await addSystemEvent(ticketId, "Draft approved", {
    approvedBy: agentId ?? "unknown",
    draftId: draftEvent.id,
  });

  logger.info(
    { ticketId, agentId, hasActions: !!metadata.proposedActions?.length },
    "Draft approved"
  );

  return {
    reply: metadata.proposedReply,
    actions: metadata.proposedActions ?? [],
    toEmail: ticket.contact,
    inReplyTo: emailMeta?.messageId,
    references: emailMeta?.references ?? emailMeta?.messageId,
  };
}

/**
 * 拒绝草稿
 */
export async function rejectDraft(
  ticketId: string,
  agentId?: string,
  reason?: string
): Promise<boolean> {
  // 找到最新的 DRAFT 事件
  const draftEvent = await db.supportTimeline.findFirst({
    where: {
      ticketId,
      type: "DRAFT",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!draftEvent) {
    logger.warn({ ticketId }, "No draft found for rejection");
    return false;
  }

  // 记录拒绝事件
  await addSystemEvent(ticketId, `Draft rejected: ${reason ?? "No reason provided"}`, {
    rejectedBy: agentId ?? "unknown",
    draftId: draftEvent.id,
    reason,
  });

  // 工单保持 NEEDS_APPROVAL 状态，等待人工处理
  // 或者可以重新设置为 OPEN 让 AI 重新生成

  logger.info({ ticketId, agentId, reason }, "Draft rejected");

  return true;
}

/**
 * 获取待审核的工单列表
 */
export async function getPendingApprovalTickets(limit = 20) {
  return db.supportTicket.findMany({
    where: {
      status: "NEEDS_APPROVAL",
    },
    include: {
      timeline: {
        where: { type: "DRAFT" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

