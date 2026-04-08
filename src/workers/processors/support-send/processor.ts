/**
 * Support Send Processor
 * 
 * 通过 SMTP 发送邮件回复。
 */

import type { Job } from "bullmq";
import { createLogger } from "@/lib/logger";
import type { SupportSendJobData } from "../../queues";
import { sendEmail } from "@/server/support/providers/smtp";
import { addEvent } from "@/server/support/services/add-event";
import { markAsWaiting } from "@/server/support/services/update-status";
import type { EmailMetadata } from "@/server/support/types";

const logger = createLogger("support-send");

export async function processSupportSendJob(
  job: Job<SupportSendJobData>
): Promise<void> {
  if (job.data.type !== "send-reply") return;

  const { ticketId, toEmail, subject, body, bodyHtml, inReplyTo, references } = job.data;

  logger.info({ ticketId, toEmail, subject }, "Sending reply");

  try {
    // 1. 发送邮件
    const result = await sendEmail({
      to: toEmail,
      subject,
      text: body,
      html: bodyHtml,
      inReplyTo,
      references,
    });

    if (!result.success) {
      logger.error({ ticketId, error: result.error }, "Failed to send email");
      throw new Error(result.error ?? "Email send failed");
    }

    // 2. 记录发送事件
    const metadata: EmailMetadata = {
      messageId: result.messageId,
      inReplyTo,
      references,
    };

    await addEvent({
      ticketId,
      actor: "AI",
      type: "MESSAGE",
      content: body,
      metadata,
    });

    // 3. 更新工单状态为等待用户回复
    await markAsWaiting(ticketId);

    logger.info(
      { ticketId, messageId: result.messageId },
      "Reply sent successfully"
    );
  } catch (err) {
    logger.error({ err, ticketId }, "Failed to send reply");
    throw err;
  }
}

