/**
 * 工单状态流转
 */

import { db } from "@/server/db";
import type { SupportActorType, SupportTicketStatus } from "@prisma/client";
import { addSystemEvent } from "./add-event";

interface UpdateStatusParams {
  ticketId: string;
  status: SupportTicketStatus;
  assignedTo?: SupportActorType;
  reason?: string;
}

/**
 * 更新工单状态
 */
export async function updateTicketStatus(params: UpdateStatusParams) {
  const { ticketId, status, assignedTo, reason } = params;

  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new Error(`Ticket not found: ${ticketId}`);
  }

  const oldStatus = ticket.status;
  const oldAssignedTo = ticket.assignedTo;

  // 更新工单
  const updatedTicket = await db.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      assignedTo: assignedTo ?? ticket.assignedTo,
      resolvedAt: status === "SOLVED" ? new Date() : ticket.resolvedAt,
    },
  });

  // 记录状态变更
  if (oldStatus !== status || oldAssignedTo !== assignedTo) {
    await addSystemEvent(ticketId, reason ?? `Status changed to ${status}`, {
      oldStatus,
      newStatus: status,
      oldAssignedTo,
      newAssignedTo: assignedTo ?? oldAssignedTo,
    });
  }

  return updatedTicket;
}

/**
 * 将工单转交给人工
 */
export async function escalateToHuman(ticketId: string, reason: string) {
  return updateTicketStatus({
    ticketId,
    status: "NEEDS_APPROVAL",
    assignedTo: "AGENT",
    reason: `Escalated to human: ${reason}`,
  });
}

/**
 * 标记工单已解决
 */
export async function markAsSolved(ticketId: string) {
  return updateTicketStatus({
    ticketId,
    status: "SOLVED",
    reason: "Ticket resolved",
  });
}

/**
 * 标记工单等待用户回复
 */
export async function markAsWaiting(ticketId: string) {
  return updateTicketStatus({
    ticketId,
    status: "WAITING",
    reason: "Waiting for customer reply",
  });
}

