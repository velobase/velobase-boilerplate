/**
 * Subscription Monthly Credits Scheduler
 *
 * 使用 BullMQ repeat/cron 能力，每天定时扫描需要发放月度积分的订阅周期。
 */
import { subscriptionMonthlyCreditsQueue } from "../../queues";
import { createLogger } from "@/lib/logger";

const logger = createLogger("subscription-monthly-credits-scheduler");

export async function registerSubscriptionMonthlyCreditsScheduler(): Promise<void> {
  // 每天 01:30 运行一次（UTC），具体时间可根据业务时区再调整
  await subscriptionMonthlyCreditsQueue.add(
    "scheduled-scan",
    { type: "scheduled-scan" },
    {
      repeat: {
        pattern: "30 1 * * *", // Cron: 每天 01:30
      },
      jobId: "subscription-monthly-credits-scan", // 固定 ID 防止重复
    }
  );

  logger.info(
    "✅ Subscription monthly credits scheduler registered: 30 1 * * *"
  );
}


