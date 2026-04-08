/**
 * Touch Delivery Scheduler
 *
 * 每分钟扫描一次到期触达计划（轻量 DB 查询 + 幂等锁）。
 */
import { touchDeliveryQueue } from "../../queues";
import { createLogger } from "@/lib/logger";

const logger = createLogger("touch-delivery-scheduler");

export async function registerTouchDeliveryScheduler(): Promise<void> {
  await touchDeliveryQueue.add(
    "scheduled-scan",
    { type: "scheduled-scan" },
    {
      repeat: { pattern: "* * * * *" }, // every minute (UTC)
      jobId: "touch-delivery-scan",
    }
  );
  logger.info("✅ Touch delivery scheduler registered: * * * * *");
}


