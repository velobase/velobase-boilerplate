/**
 * 取消订阅工具
 * 
 * 支持两种模式：
 * 1. 周期结束时取消（默认）- 不退款
 * 2. 立即取消并退款剩余时间
 */

import { db } from "@/server/db";
import { logger } from "@/lib/logger";
import { getStripeClient } from "@/server/order/providers/stripe";

export interface CancelSubscriptionOptions {
  /** 是否退还剩余周期款项，默认 false */
  refundRemaining?: boolean;
}

export interface CancelSubscriptionResult {
  success: boolean;
  message: string;
  canceledAt?: Date;
  periodEnd?: Date;
  refundAmount?: number;
  refundCurrency?: string;
  error?: string;
}

/**
 * 取消用户订阅
 * 
 * @param userId - 用户 ID
 * @param options - 取消选项
 * @returns 取消结果
 */
export async function cancelSubscription(
  userId: string,
  options: CancelSubscriptionOptions = {}
): Promise<CancelSubscriptionResult> {
  const { refundRemaining = false } = options;
  const stripe = getStripeClient();

  try {
    // 1. 查找活跃订阅
    const subscription = await db.userSubscription.findFirst({
      where: {
        userId,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
    });

    if (!subscription) {
      return {
        success: false,
        message: "No active subscription found",
        error: "NO_ACTIVE_SUBSCRIPTION",
      };
    }

    if (!subscription.gatewaySubscriptionId) {
      return {
        success: false,
        message: "Subscription has no gateway ID",
        error: "NO_GATEWAY_ID",
      };
    }

    const now = new Date();

    if (refundRemaining) {
      // 立即取消并按比例退款
      const stripeSubscription = await stripe.subscriptions.cancel(
        subscription.gatewaySubscriptionId,
        {
          prorate: true, // 按比例计算
        }
      );

      // 更新本地数据库
      await db.$transaction(async (tx) => {
        await tx.userSubscription.update({
          where: { id: subscription.id },
          data: {
            status: "CANCELED",
            cancelAtPeriodEnd: false,
            canceledAt: now,
            endedAt: now,
          },
        });

        await tx.userSubscriptionCycle.updateMany({
          where: { subscriptionId: subscription.id, status: "ACTIVE" },
          data: { status: "CLOSED" },
        });
      });

      // 计算退款金额（如果有的话）
      // Stripe 会自动处理 proration，这里我们记录信息
      logger.info(
        {
          userId,
          subscriptionId: subscription.id,
          stripeStatus: stripeSubscription.status,
        },
        "Subscription canceled immediately with proration"
      );

      return {
        success: true,
        message: "Subscription canceled immediately. Prorated refund will be applied to next invoice or refunded.",
        canceledAt: now,
        // Note: 实际退款金额需要从 Stripe invoice 获取
      };
    } else {
      // 周期结束时取消（不退款）
      const stripeSubscription = await stripe.subscriptions.update(
        subscription.gatewaySubscriptionId,
        { cancel_at_period_end: true }
      );

      // 更新本地数据库
      await db.userSubscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: now,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      const currentPeriodEnd = (stripeSubscription as any).current_period_end as number | undefined;
      const periodEnd = currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000)
        : undefined;

      logger.info(
        { userId, subscriptionId: subscription.id, periodEnd },
        "Subscription set to cancel at period end"
      );

      return {
        success: true,
        message: `Subscription will be canceled at period end${periodEnd ? ` (${periodEnd.toISOString()})` : ""}`,
        canceledAt: now,
        periodEnd,
      };
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err, userId, refundRemaining }, "Failed to cancel subscription");

    return {
      success: false,
      message: "Failed to cancel subscription",
      error: errorMessage,
    };
  }
}
