/**
 * 根据邮件查找或创建工单
 * 
 * 逻辑：
 * 1. 如果邮件有 In-Reply-To，尝试通过 messageId 找到对应的工单
 * 2. 如果找不到，创建新工单
 * 3. 添加 MESSAGE 事件到 timeline
 */

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import type { SupportTicket, Prisma } from "@prisma/client";
import type { ParsedEmail, EmailMetadata } from "../types";

/**
 * 根据邮件查找或创建工单
 */
export async function findOrCreateTicket(email: ParsedEmail): Promise<SupportTicket> {
  const fromEmail = email.from.address.toLowerCase();

  // 1. 如果是回复邮件，尝试找到原始工单
  if (email.inReplyTo) {
    const existingEvent = await db.supportTimeline.findFirst({
      where: {
        metadata: {
          path: ["messageId"],
          equals: email.inReplyTo,
        },
      },
      include: {
        ticket: true,
      },
    });

    if (existingEvent?.ticket) {
      logger.info(
        { ticketId: existingEvent.ticket.id, inReplyTo: email.inReplyTo },
        "Found existing ticket via In-Reply-To"
      );

      // 添加新消息到 timeline
      await addMessageToTimeline(existingEvent.ticket.id, email);

      // 更新工单状态（用户回复了，重新进入 OPEN）
      const updatedTicket = await db.supportTicket.update({
        where: { id: existingEvent.ticket.id },
        data: {
          status: "OPEN",
          assignedTo: "AI",
          updatedAt: new Date(),
        },
      });

      return updatedTicket;
    }
  }

  // 2. 尝试通过 References 查找
  if (email.references) {
    const refIds = email.references.split(/\s+/).filter(Boolean);
    for (const refId of refIds) {
      const existingEvent = await db.supportTimeline.findFirst({
        where: {
          metadata: {
            path: ["messageId"],
            equals: refId,
          },
        },
        include: {
          ticket: true,
        },
      });

      if (existingEvent?.ticket) {
        logger.info(
          { ticketId: existingEvent.ticket.id, reference: refId },
          "Found existing ticket via References"
        );

        await addMessageToTimeline(existingEvent.ticket.id, email);

        const updatedTicket = await db.supportTicket.update({
          where: { id: existingEvent.ticket.id },
          data: {
            status: "OPEN",
            assignedTo: "AI",
            updatedAt: new Date(),
          },
        });

        return updatedTicket;
      }
    }
  }

  // 3. 创建新工单
  logger.info({ from: fromEmail, subject: email.subject }, "Creating new ticket");

  // 尝试匹配系统用户
  const user = await db.user.findFirst({
    where: {
      OR: [
        { email: fromEmail },
        { canonicalEmail: fromEmail },
      ],
    },
  });

  const ticket = await db.supportTicket.create({
    data: {
      userId: user?.id,
      contact: fromEmail,
      channel: "email",
      subject: email.subject,
      status: "OPEN",
      assignedTo: "AI",
    },
  });

  // 添加第一条消息
  await addMessageToTimeline(ticket.id, email);

  logger.info(
    { ticketId: ticket.id, userId: user?.id, from: fromEmail },
    "New ticket created"
  );

  return ticket;
}

/**
 * 添加消息到工单 timeline
 */
async function addMessageToTimeline(ticketId: string, email: ParsedEmail): Promise<void> {
  const metadata: EmailMetadata = {
    messageId: email.messageId,
    inReplyTo: email.inReplyTo,
    references: email.references,
    cc: email.cc,
  };

  await db.supportTimeline.create({
    data: {
      ticketId,
      actor: "USER",
      type: "MESSAGE",
      content: email.text ?? email.html ?? "",
      metadata: metadata as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * 检查邮件是否已处理过（防止重复导入）
 */
export async function isEmailProcessed(messageId: string): Promise<boolean> {
  const existing = await db.supportTimeline.findFirst({
    where: {
      metadata: {
        path: ["messageId"],
        equals: messageId,
      },
    },
  });

  return !!existing;
}

