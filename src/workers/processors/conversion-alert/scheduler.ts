/**
 * Conversion Alert Scheduler
 *
 * 每小时检查注册转化率
 */
import { conversionAlertQueue } from "../../queues/conversion-alert.queue";
import { createLogger } from "@/lib/logger";

const logger = createLogger("conversion-alert-scheduler");

export async function registerConversionAlertScheduler(): Promise<void> {
  await conversionAlertQueue.add(
    "hourly-check",
    { type: "hourly-check" },
    {
      repeat: {
        pattern: "0 * * * *", // 每小时整点
      },
      jobId: "conversion-alert-hourly-check",
    }
  );

  logger.info("✅ Conversion alert scheduler registered: every hour");
}

