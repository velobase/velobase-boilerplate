import { db } from "@/server/db";
import { cancelAirwallexSubscription } from "@/server/order/providers/airwallex";
import { getStripeClient } from "@/server/order/providers/stripe";
import { logger } from "@/server/shared/telemetry/logger";

interface CancelSubscriptionNowParams {
  subscriptionId: string;
}

/**
 * 立刻取消一条用户订阅：
 * - 若为 Stripe 订阅，则调用 Stripe API 取消
 * - 本地将 UserSubscription 标记为 CANCELED，并关闭所有 ACTIVE 周期
 *
 * 该函数设计为幂等：重复调用对结果没有副作用。
 */
export async function cancelSubscriptionNow(
  params: CancelSubscriptionNowParams,
): Promise<void> {
  const { subscriptionId } = params;

  const sub = await db.userSubscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!sub) {
    logger.warn({ subscriptionId }, "cancelSubscriptionNow: subscription not found");
    return;
  }

  if (sub.status === "CANCELED") {
    // 已经是取消状态，直接返回
    return;
  }

  // 网关侧取消
  const gateway = sub.gateway?.toUpperCase();
  if (sub.gatewaySubscriptionId) {
    if (gateway === "STRIPE") {
      try {
        const stripe = getStripeClient();
        await stripe.subscriptions.cancel(sub.gatewaySubscriptionId, {
          // TODO: 根据业务需要决定是否做 proration 或退款
          // proration_behavior: "none",
        });
      } catch (err) {
        logger.error(
          {
            err,
            subscriptionId: sub.id,
            gatewaySubscriptionId: sub.gatewaySubscriptionId,
          },
          "cancelSubscriptionNow: failed to cancel Stripe subscription",
        );
      }
    } else if (gateway === "AIRWALLEX") {
      try {
        const result = await cancelAirwallexSubscription(sub.gatewaySubscriptionId, {
          immediately: true,
          prorationBehavior: "NONE", // 不退款，与 Stripe 行为一致
        });
        if (!result.success) {
          logger.error(
            {
              subscriptionId: sub.id,
              gatewaySubscriptionId: sub.gatewaySubscriptionId,
              error: result.error,
            },
            "cancelSubscriptionNow: failed to cancel Airwallex subscription",
          );
        }
      } catch (err) {
        logger.error(
          {
            err,
            subscriptionId: sub.id,
            gatewaySubscriptionId: sub.gatewaySubscriptionId,
          },
          "cancelSubscriptionNow: failed to cancel Airwallex subscription",
        );
      }
    }
  }

  const now = new Date();

  // 本地标记订阅结束，并关闭当前所有 ACTIVE 周期
  await db.$transaction(async (tx) => {
    await tx.userSubscription.update({
      where: { id: sub.id },
      data: {
        status: "CANCELED",
        cancelAtPeriodEnd: false,
        canceledAt: sub.canceledAt ?? now,
        endedAt: sub.endedAt ?? now,
      },
    });

    await tx.userSubscriptionCycle.updateMany({
      where: { subscriptionId: sub.id, status: "ACTIVE" },
      data: { status: "CLOSED" },
    });
  });
}

