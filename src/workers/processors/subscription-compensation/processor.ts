/**
 * Subscription Compensation Processor
 *
 * 订阅续费 / 提前转正补偿：
 * - 兜底 Stripe webhook 失败或处理异常导致的：
 *   - 仍然处于 TRIAL 周期
 *   - 但 Stripe 已经对该订阅成功扣款（invoice.payment_succeeded）
 *   - 且本地尚未创建 REGULAR 周期 / 发放会员积分
 */
import type { Job } from "bullmq";
import Stripe from "stripe";
import { createLogger } from "@/lib/logger";
import { db } from "@/server/db";
import { getStripeSecretKey } from "@/server/shared/env";
import { BaseWebhookResult } from "@/server/order/providers/types";
import type { SubscriptionCompensationJobData } from "../../queues/subscription-compensation.queue";
import type { PaymentWebhookResult } from "@/server/order/providers/types";
import { handleStripeSubscriptionRenewal } from "@/server/order/services/handle-webhooks";

const logger = createLogger("subscription-compensation");

// 独立 Stripe 客户端，避免与主进程耦合
const stripe = new Stripe(getStripeSecretKey(), {
  apiVersion: "2025-09-30.clover",
});

export async function processSubscriptionCompensationJob(
  job: Job<SubscriptionCompensationJobData>
): Promise<void> {
  const { type, subscriptionId } = job.data;

  if (type === "manual-check" && subscriptionId) {
    await compensateSingleSubscription(subscriptionId);
    return;
  }

  if (type === "scheduled-scan") {
    await scanAndCompensateSubscriptions();
  }
}

/**
 * 扫描存在异常状态的 Stripe 订阅：
 * - gateway = STRIPE
 * - ACTIVE TRIAL 周期存在
 * - 尚未创建 REGULAR 周期
 */
async function scanAndCompensateSubscriptions(): Promise<void> {
  const subscriptions = await db.userSubscription.findMany({
    where: {
      gateway: "STRIPE",
      deletedAt: null,
      status: "ACTIVE",
    },
    include: {
      cycles: {
        orderBy: { sequenceNumber: "desc" },
      },
    },
    take: 50,
  });

  if (subscriptions.length === 0) {
    logger.info("No Stripe subscriptions found for compensation scan");
    return;
  }

  logger.info(
    { count: subscriptions.length },
    "Scanning subscriptions for potential compensation"
  );

  for (const sub of subscriptions) {
    try {
      await compensateSubscriptionIfNeeded(sub.id);
    } catch (error) {
      logger.error(
        { subscriptionId: sub.id, error },
        "Failed to compensate subscription"
      );
    }
  }
}

async function compensateSingleSubscription(subscriptionId: string): Promise<void> {
  await compensateSubscriptionIfNeeded(subscriptionId);
}

/**
 * 对单个订阅做补偿判断与执行：
 * - 仍然只有 TRIAL 周期（ACTIVE）
 * - Stripe 侧已经有付费的 invoice （billing_reason=subscription_update 或 subscription_cycle）
 * - 则构造一个 PaymentWebhookResult，复用 handleSubscriptionWebhook 现有逻辑
 */
async function compensateSubscriptionIfNeeded(subscriptionId: string): Promise<void> {
  const subscription = await db.userSubscription.findUnique({
    where: { id: subscriptionId },
    include: {
      cycles: {
        orderBy: { sequenceNumber: "desc" },
      },
    },
  });

  if (!subscription) {
    logger.warn({ subscriptionId }, "Subscription not found");
    return;
  }

  if (subscription.gateway !== "STRIPE" || !subscription.gatewaySubscriptionId) {
    return;
  }

  const activeTrial = subscription.cycles.find(
    (c) => c.status === "ACTIVE" && c.type === "TRIAL"
  );
  const hasRegularCycle = subscription.cycles.some((c) => c.type === "REGULAR");

  // 只处理：仍在 TRIAL，且尚未有 REGULAR 周期的订阅
  if (!activeTrial || hasRegularCycle) {
    return;
  }

  // 查询 Stripe 侧该订阅的最近 invoice，判断是否已经产生过实际扣款
  let invoices: Stripe.ApiList<Stripe.Invoice> | null = null;
  try {
    invoices = await stripe.invoices.list({
      subscription: subscription.gatewaySubscriptionId,
      limit: 5,
    });
  } catch (error) {
    logger.warn(
      {
        subscriptionId: subscription.id,
        gatewaySubscriptionId: subscription.gatewaySubscriptionId,
        error,
      },
      "Failed to list invoices from Stripe"
    );
    return;
  }

  if (!invoices || invoices.data.length === 0) {
    return;
  }

  // 寻找一张已支付且有实际扣款的 invoice
  const paidInvoice = invoices.data.find(
    (inv) =>
      inv.status === "paid" &&
      (inv.amount_paid ?? 0) > 0 &&
      (inv.billing_reason === "subscription_update" ||
        inv.billing_reason === "subscription_cycle")
  );

  if (!paidInvoice) {
    return;
  }

  // 构造一个“伪” PaymentWebhookResult，模拟 invoice.payment_succeeded 事件，
  // 并将 subscriptionPeriod 设置为 2，让 handleSubscriptionWebhook 将其视为续费/正式周期开始。
  const result: PaymentWebhookResult = new BaseWebhookResult({
    status: "SUCCEEDED",
    gatewayTransactionId: paidInvoice.id,
    gatewaySubscriptionId: subscription.gatewaySubscriptionId,
    subscriptionPeriod: 2,
    amount: paidInvoice.amount_paid ?? undefined,
    currency: paidInvoice.currency ?? undefined,
    rawData: paidInvoice,
    isSubscription: true,
  });

  logger.info(
    {
      subscriptionId: subscription.id,
      gatewaySubscriptionId: subscription.gatewaySubscriptionId,
      invoiceId: paidInvoice.id,
      billingReason: paidInvoice.billing_reason,
      amountPaid: paidInvoice.amount_paid,
    },
    "Triggering subscription renewal compensation via worker"
  );

  // 直接复用现有的续费履约逻辑
  await handleStripeSubscriptionRenewal(result);
}



