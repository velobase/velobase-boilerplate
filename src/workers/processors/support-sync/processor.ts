/**
 * Support Sync Processor
 * 
 * 从 IMAP 拉取新邮件，创建/更新工单，入 process 队列。
 */

import type { Job } from "bullmq";
import { createLogger } from "@/lib/logger";
import { db } from "@/server/db";
import type { SupportSyncJobData } from "../../queues";
import { supportProcessQueue } from "../../queues";
import { fetchNewEmails, getMaxUid } from "@/server/support/providers/imap";
import { findOrCreateTicket, isEmailProcessed } from "@/server/support/services";

const logger = createLogger("support-sync");

const CURSOR_ID = "email_inbox";

/**
 * 获取或初始化同步游标
 */
async function getOrCreateCursor(): Promise<number> {
  let cursor = await db.supportSyncCursor.findUnique({
    where: { id: CURSOR_ID },
  });

  if (!cursor) {
    // 首次运行，初始化为当前最大 UID（不处理历史邮件）
    const maxUid = await getMaxUid();
    cursor = await db.supportSyncCursor.create({
      data: { id: CURSOR_ID, lastUid: maxUid },
    });
    logger.info({ lastUid: maxUid }, "Sync cursor initialized");
  }

  return cursor.lastUid;
}

/**
 * 更新同步游标
 */
async function updateCursor(lastUid: number): Promise<void> {
  await db.supportSyncCursor.update({
    where: { id: CURSOR_ID },
    data: { lastUid },
  });
}

export async function processSupportSyncJob(
  job: Job<SupportSyncJobData>
): Promise<void> {
  if (job.data.type !== "scheduled-scan") return;

  logger.info("Starting email sync scan");

  try {
    // 1. 获取同步游标
    const lastUid = await getOrCreateCursor();

    // 2. 从 IMAP 拉取新邮件
    const emails = await fetchNewEmails(lastUid);

    if (emails.length === 0) {
      logger.debug("No new emails");
      return;
    }

    logger.info({ count: emails.length }, "Fetched new emails");

    let processed = 0;
    let maxUid = lastUid;

    // 3. 处理每封邮件
    for (const email of emails) {
      try {
        // 检查是否已处理过
        if (await isEmailProcessed(email.messageId)) {
          logger.debug({ messageId: email.messageId }, "Email already processed, skipping");
          maxUid = Math.max(maxUid, email.uid);
          continue;
        }

        // 创建或更新工单
        const ticket = await findOrCreateTicket(email);

        // 入 process 队列
        await supportProcessQueue.add(
          `process-${ticket.id}`,
          {
            type: "process-ticket",
            ticketId: ticket.id,
          },
          {
            jobId: `process-${ticket.id}-${Date.now()}`,
          }
        );

        processed++;
        maxUid = Math.max(maxUid, email.uid);

        logger.info(
          { ticketId: ticket.id, from: email.from.address, subject: email.subject },
          "Email processed, ticket queued"
        );
      } catch (err) {
        logger.error({ err, messageId: email.messageId }, "Failed to process email");
        // 继续处理下一封
      }
    }

    // 4. 更新同步游标
    if (maxUid > lastUid) {
      await updateCursor(maxUid);
    }

    logger.info({ processed, total: emails.length, newLastUid: maxUid }, "Email sync complete");
  } catch (err) {
    logger.error({ err }, "Email sync failed");
    throw err;
  }
}

