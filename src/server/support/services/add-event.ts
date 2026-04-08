/**
 * 添加事件到工单 Timeline
 */

import { db } from "@/server/db";
import type { Prisma, SupportActorType } from "@prisma/client";
import type { TimelineEvent } from "../types";

/**
 * 添加事件到工单 Timeline
 */
export async function addEvent(event: TimelineEvent) {
  return db.supportTimeline.create({
    data: {
      ticketId: event.ticketId,
      actor: event.actor,
      actorId: event.actorId,
      type: event.type,
      content: event.content,
      metadata: event.metadata as Prisma.InputJsonValue ?? undefined,
    },
  });
}

/**
 * 添加草稿事件
 */
export async function addDraftEvent(
  ticketId: string,
  proposedReply: string,
  confidence: number,
  proposedActions?: Array<{ tool: string; args: Record<string, unknown>; description: string }>,
  reasoning?: string
) {
  return addEvent({
    ticketId,
    actor: "AI",
    type: "DRAFT",
    content: proposedReply,
    metadata: {
      proposedReply,
      proposedActions,
      confidence,
      reasoning,
    },
  });
}

/**
 * 添加操作事件
 */
export async function addActionEvent(
  ticketId: string,
  actor: SupportActorType,
  actorId: string | undefined,
  tool: string,
  args: Record<string, unknown>,
  result: unknown,
  success: boolean,
  error?: string
) {
  return addEvent({
    ticketId,
    actor,
    actorId,
    type: "ACTION",
    content: `Executed ${tool}`,
    metadata: {
      tool,
      args,
      result,
      success,
      error,
    },
  });
}

/**
 * 添加系统事件（状态变更等）
 */
export async function addSystemEvent(
  ticketId: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  return addEvent({
    ticketId,
    actor: "SYSTEM",
    type: "SYSTEM",
    content: description,
    metadata,
  });
}

/**
 * 添加内部备注
 */
export async function addNoteEvent(
  ticketId: string,
  actorId: string,
  note: string
) {
  return addEvent({
    ticketId,
    actor: "AGENT",
    actorId,
    type: "NOTE",
    content: note,
  });
}

