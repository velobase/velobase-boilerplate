/**
 * Stale Job Cleanup Scheduler
 *
 * 每 5 分钟扫描一次超时任务
 */
import { staleJobCleanupQueue } from "../../queues/stale-job-cleanup.queue";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stale-job-cleanup-scheduler");

export async function registerStaleJobCleanupScheduler(): Promise<void> {
  await staleJobCleanupQueue.add(
    "scheduled-scan",
    { type: "scheduled-scan" },
    {
      repeat: {
        pattern: "*/5 * * * *", // 每 5 分钟
      },
      jobId: "stale-job-cleanup-scan",
    }
  );

  logger.info("✅ Stale job cleanup scheduler registered: every 5 minutes");
}

