/**
 * Support Sync Scheduler
 *
 * 每分钟扫描一次 IMAP 收取新邮件。
 */
import { supportSyncQueue } from "../../queues";
import { createLogger } from "@/lib/logger";

const logger = createLogger("support-sync-scheduler");

export async function registerSupportSyncScheduler(): Promise<void> {
  await supportSyncQueue.add(
    "scheduled-scan",
    { type: "scheduled-scan" },
    {
      repeat: { pattern: "* * * * *" }, // every minute
      jobId: "support-sync-scan",
    }
  );
  logger.info("✅ Support sync scheduler registered: * * * * *");
}

