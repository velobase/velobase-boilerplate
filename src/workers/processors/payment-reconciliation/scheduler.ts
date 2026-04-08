/**
 * Payment Reconciliation Scheduler
 *
 * 每小时整点触发；processor 内部在 LA 00:00 只发天报。
 */
import { paymentReconciliationQueue } from "@/workers/queues/payment-reconciliation.queue";
import { createLogger } from "@/lib/logger";

const logger = createLogger("payment-reconciliation-scheduler");

export async function registerPaymentReconciliationScheduler(): Promise<void> {
  await paymentReconciliationQueue.add(
    "hourly-reconcile",
    { type: "hourly-reconcile" },
    {
      repeat: { pattern: "0 * * * *" },
      jobId: "payment-reconciliation-hourly",
    }
  );

  logger.info("✅ Payment reconciliation scheduler registered: hourly (minute 0)");
}


