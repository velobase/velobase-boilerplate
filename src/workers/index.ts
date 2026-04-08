/**
 * Worker Entry Point
 * 
 * Fastify + BullMQ Worker 服务入口
 */
import "dotenv/config";

import { redis } from "@/server/redis";

const WORKER_PORT = parseInt(process.env.WORKER_PORT ?? "3001", 10);
import { createServer } from "./server";
import { createWorkerInstance } from "./utils/create-worker";
import {
  orderCompensationQueue,
  subscriptionMonthlyCreditsQueue,
  subscriptionCompensationQueue,
  staleJobCleanupQueue,
  STALE_JOB_CLEANUP_QUEUE_NAME,
  conversionAlertQueue,
  CONVERSION_ALERT_QUEUE_NAME,
  paymentReconciliationQueue,
  PAYMENT_RECONCILIATION_QUEUE_NAME,
  touchDeliveryQueue,
  TOUCH_DELIVERY_QUEUE_NAME,
  supportSyncQueue,
  SUPPORT_SYNC_QUEUE_NAME,
  supportProcessQueue,
  SUPPORT_PROCESS_QUEUE_NAME,
  supportSendQueue,
  SUPPORT_SEND_QUEUE_NAME,
  googleAdsUploadQueue,
  GOOGLE_ADS_UPLOAD_QUEUE_NAME,
} from "./queues";

import {
  processOrderCompensationJob,
  registerOrderCompensationScheduler,
  processSubscriptionMonthlyCreditsJob,
  registerSubscriptionMonthlyCreditsScheduler,
  processSubscriptionCompensationJob,
  registerSubscriptionCompensationScheduler,
  processStaleJobCleanup,
  registerStaleJobCleanupScheduler,
  processConversionAlert,
  registerConversionAlertScheduler,
  processPaymentReconciliation,
  registerPaymentReconciliationScheduler,
  processTouchDeliveryJob,
  registerTouchDeliveryScheduler,
  processSupportSyncJob,
  registerSupportSyncScheduler,
  processSupportProcessJob,
  registerSupportProcessScheduler,
  processSupportSendJob,
  registerSupportSendScheduler,
  processGoogleAdsUploadJob,
  registerGoogleAdsUploadScheduler,
} from "./processors";

import { createLogger } from "@/lib/logger";

const logger = createLogger("main");

// ====== Workers ======

const orderCompensationWorker = createWorkerInstance(
  "order-compensation",
  processOrderCompensationJob,
  {
    concurrency: 1, // 顺序处理，避免重复补偿
    lockDuration: 300000, // 5 minutes
  }
);

const subscriptionMonthlyCreditsWorker = createWorkerInstance(
  "subscription-monthly-credits",
  processSubscriptionMonthlyCreditsJob,
  {
    concurrency: 1,
    lockDuration: 300000,
  }
);

const subscriptionCompensationWorker = createWorkerInstance(
  "subscription-compensation",
  processSubscriptionCompensationJob,
  {
    concurrency: 1,
    lockDuration: 300000,
  }
);

const staleJobCleanupWorker = createWorkerInstance(
  STALE_JOB_CLEANUP_QUEUE_NAME,
  processStaleJobCleanup,
  {
    concurrency: 1,
    lockDuration: 300000, // 5 minutes
  }
);

const conversionAlertWorker = createWorkerInstance(
  CONVERSION_ALERT_QUEUE_NAME,
  processConversionAlert,
  {
    concurrency: 1,
    lockDuration: 60000, // 1 minute
  }
);

const paymentReconciliationWorker = createWorkerInstance(
  PAYMENT_RECONCILIATION_QUEUE_NAME,
  processPaymentReconciliation,
  {
    concurrency: 1,
    lockDuration: 300000, // 5 minutes
  }
);

const touchDeliveryWorker = createWorkerInstance(
  TOUCH_DELIVERY_QUEUE_NAME,
  processTouchDeliveryJob,
  {
    concurrency: 2,
    lockDuration: 300000,
  }
);

const supportSyncWorker = createWorkerInstance(
  SUPPORT_SYNC_QUEUE_NAME,
  processSupportSyncJob,
  {
    concurrency: 1, // 单线程同步，避免重复拉取
    lockDuration: 120000, // 2 minutes
  }
);

const supportProcessWorker = createWorkerInstance(
  SUPPORT_PROCESS_QUEUE_NAME,
  processSupportProcessJob,
  {
    concurrency: 5, // AI 处理可以并发
    lockDuration: 300000, // 5 minutes
  }
);

const supportSendWorker = createWorkerInstance(
  SUPPORT_SEND_QUEUE_NAME,
  processSupportSendJob,
  {
    concurrency: 3, // 发送邮件可以并发
    lockDuration: 60000, // 1 minute
  }
);

const googleAdsUploadWorker = createWorkerInstance(
  GOOGLE_ADS_UPLOAD_QUEUE_NAME,
  processGoogleAdsUploadJob,
  {
    // 定时 flush 任务（每 5 分钟），不需要高并发
    concurrency: 1,
    lockDuration: 300000, // 5 minutes
  }
);

// ====== Startup ======

async function start() {
  logger.info("🚀 Worker starting...");

  try {
    // 创建 HTTP 服务器
    const server = await createServer();

    // 注册定时任务
    await registerOrderCompensationScheduler();
    await registerSubscriptionMonthlyCreditsScheduler();
    await registerSubscriptionCompensationScheduler();
    await registerStaleJobCleanupScheduler();
    await registerConversionAlertScheduler();
    await registerPaymentReconciliationScheduler();
    await registerTouchDeliveryScheduler();
    await registerSupportSyncScheduler();
    await registerSupportProcessScheduler();
    await registerSupportSendScheduler();
    await registerGoogleAdsUploadScheduler();

    // 启动 HTTP 服务器
    await server.listen({ port: WORKER_PORT, host: "0.0.0.0" });

    logger.info(
      { port: WORKER_PORT },
      `✅ Worker ready - HTTP server listening on port ${WORKER_PORT}`
    );
    logger.info("📊 Bull Board UI: /_worker/queues");
    logger.info("❤️ Health check: /health");
  } catch (error) {
    logger.fatal({ error }, "Failed to start worker");
    process.exit(1);
  }
}

// ====== Graceful Shutdown ======

async function shutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal");

  try {
    // 关闭 workers
    await orderCompensationWorker.close();
    await subscriptionMonthlyCreditsWorker.close();
    await subscriptionCompensationWorker.close();
    await staleJobCleanupWorker.close();
    await conversionAlertWorker.close();
    await paymentReconciliationWorker.close();
    await touchDeliveryWorker.close();
    await supportSyncWorker.close();
    await supportProcessWorker.close();
    await supportSendWorker.close();
    await googleAdsUploadWorker.close();
    logger.info("Workers closed");

    // 关闭队列连接
    await orderCompensationQueue.close();
    await subscriptionMonthlyCreditsQueue.close();
    await subscriptionCompensationQueue.close();
    await staleJobCleanupQueue.close();
    await conversionAlertQueue.close();
    await paymentReconciliationQueue.close();
    await touchDeliveryQueue.close();
    await supportSyncQueue.close();
    await supportProcessQueue.close();
    await supportSendQueue.close();
    await googleAdsUploadQueue.close();
    logger.info("Queues closed");

    // 关闭 Redis
    await redis.quit();
    logger.info("Redis connection closed");

    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Error during shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// 未捕获异常处理
process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled rejection");
  process.exit(1);
});

// 启动
void start();
