/**
 * Order Compensation Scheduler
 * 
 * 每 10 分钟扫描一次 PENDING 支付
 */
import { orderCompensationQueue } from "../../queues";
import { createLogger } from "@/lib/logger";

const logger = createLogger("order-compensation-scheduler");

/**
 * 注册订单补偿定时任务
 */
export async function registerOrderCompensationScheduler(): Promise<void> {
  // 每 10 分钟扫描一次
  await orderCompensationQueue.add(
    "scheduled-scan",
    { type: "scheduled-scan" },
    {
      repeat: {
        pattern: "*/10 * * * *", // Cron: 每 10 分钟
      },
      jobId: "order-compensation-scan", // 固定 ID 防止重复
    }
  );

  logger.info("✅ Order compensation scheduler registered: every 10 minutes");
}

