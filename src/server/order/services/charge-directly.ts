import { db } from "@/server/db";
import { getStripeClient } from "../providers/stripe";
import { logger } from "@/server/shared/telemetry/logger";
import { processFulfillmentByPayment } from "@/server/fulfillment/manager";
import { enqueueGoogleAdsUploadsForPayment } from "@/server/ads/google-ads/queue";
import type { Prisma } from "@prisma/client";
import { asyncSendPaymentNotification } from "@/lib/lark";
import { getServerPostHog } from "@/analytics/server";
import { BILLING_EVENTS } from "@/analytics/events/billing";
import { buildProductSnapshot } from "./product-snapshot";
import { createAffiliateEarningForOrderPayment } from "@/server/affiliate/services/ledger";

type ChargeDirectlyProduct = {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  currency: string;
  type: string;
  status: string;
  interval: string | null;
  description: unknown;
  metadata: Prisma.JsonValue | null;
  hasTrial: boolean;
  trialDays: number | null;
  trialCreditsAmount: number | null;
  creditsPackage: { creditsAmount: number } | null;
};

export interface ChargeDirectlyParams {
  userId: string;
  // checkout() 里用 getProduct() 获取：已 include creditsPackage
  product: ChargeDirectlyProduct;
  paymentMethodId: string;
}

export interface ChargeDirectlyResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  error?: string;
  requiresAction?: boolean;
  clientSecret?: string;
}

/**
 * 直接扣款（不跳转 Stripe Checkout）
 * 
 * 适用于：用户已有保存的卡，单次购买积分包等场景
 */
export async function chargeDirectly(
  params: ChargeDirectlyParams
): Promise<ChargeDirectlyResult> {
  const { userId, product, paymentMethodId } = params;
  // Hard guarantee: do not throw from this function.
  // checkout() relies on "direct charge failed -> fallback to Stripe Checkout" behavior.
  // If we throw here, frontend may not receive a hosted payment URL.
  let orderId: string | undefined;
  let paymentId: string | undefined;
  let stripeChargeSucceeded = false;

  try {
    // 获取用户
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const stripeCustomerId = (user as { stripeCustomerId?: string | null })
      ?.stripeCustomerId;
    if (!stripeCustomerId) {
      return { success: false, error: "User has no Stripe customer ID" };
    }

    // 创建订单
    const orderTimeoutMinutes = 15;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + orderTimeoutMinutes);

    const productSnapshot = buildProductSnapshot(product);

    const order = await db.order.create({
      data: {
        userId,
        productId: product.id,
        type: "NEW_PURCHASE",
        status: "PENDING",
        amount: product.price,
        currency: product.currency,
        productSnapshot,
        expiresAt,
      },
    });
    orderId = order.id;

    // 创建 Payment 记录
    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        userId,
        amount: product.price,
        currency: product.currency,
        status: "PENDING",
        paymentGateway: "STRIPE",
        expiresAt,
      },
    });
    paymentId = payment.id;
    let paymentIntentId: string | undefined;

    // 调用 Stripe 直接扣款
    try {
      const stripe = getStripeClient();

      const paymentIntent = await stripe.paymentIntents.create({
        amount: product.price,
        currency: product.currency,
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          orderId: order.id,
          paymentId: payment.id,
          productId: product.id,
        },
      });
      paymentIntentId = paymentIntent.id;

      if (paymentIntent.status === "succeeded") {
        // Mark ASAP to avoid accidental checkout fallback + double charge on unexpected downstream errors.
        stripeChargeSucceeded = true;

        // 扣款成功：先落 Stripe transaction id（保持 payment 为 PENDING），
        // 若后续履约/状态更新抛错，success page 可通过 confirmPayment 兜底完成，避免二次扣款。
        await db.payment.update({
          where: { id: payment.id },
          data: {
            gatewayTransactionId: paymentIntent.id,
            gatewayResponse: JSON.parse(
              JSON.stringify(paymentIntent)
            ) as Prisma.JsonObject,
          },
        });

        // 履约
        const freshPayment = await db.payment.findUnique({
          where: { id: payment.id },
        });
        if (freshPayment) {
          await processFulfillmentByPayment(freshPayment);
        }

        // 履约完成后再标记成功（避免“支付成功但未履约”的 SUCCEEDED 卡死状态）
        await db.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCEEDED" },
        });
        await db.order.update({
          where: { id: order.id },
          data: { status: "FULFILLED" },
        });
        await db.user.update({
          where: { id: userId },
          data: { hasPurchased: true },
        });

      // Google Ads Offline Conversion: direct charge 成功时也要回传（否则 webhook 可能因"已履约"提前 return）
      setImmediate(() => {
        void enqueueGoogleAdsUploadsForPayment(payment.id).catch((error) => {
          logger.warn(
            { error, paymentId: payment.id, orderId: order.id, gateway: "stripe" },
            "Google Ads upload enqueue (direct charge) failed"
          );
        });
      });

      // PostHog 上报
      void (async () => {
        const posthog = getServerPostHog();
        if (!posthog) return;
        try {
          const productType =
            product.type === "SUBSCRIPTION"
              ? "subscription"
              : product.type === "CREDITS_PACKAGE"
                ? "credits"
                : product.type.toLowerCase();

          let priceVariant: string | undefined;
          if (product.metadata && typeof product.metadata === "object") {
            const meta = product.metadata as { priceVariant?: string };
            priceVariant = meta.priceVariant;
          }

          const allFlags = await posthog.getAllFlags(userId);
          const featureFlagProps: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(allFlags)) {
            if (value !== undefined && value !== null) {
              featureFlagProps[`$feature/${key}`] = value;
            }
          }

          posthog.capture({
            distinctId: userId,
            event: BILLING_EVENTS.CREDITS_PURCHASE_SUCCESS,
            properties: {
              package_id: product.id,
              credits: product.creditsPackage?.creditsAmount ?? 0,
              currency: order.currency,
              amount_cents: order.amount,
              amount: order.amount / 100,
              price: order.amount / 100,
              country_code: (user as { countryCode?: string | null }).countryCode ?? null,
              gateway: "stripe",
              order_id: order.id,
              payment_id: payment.id,
              product_type: productType,
              price_variant: priceVariant,
              source: "direct_charge",
              ...featureFlagProps,
            },
          });
          await posthog.shutdown();
        } catch (err) {
          logger.error({ error: err, paymentId: payment.id }, "PostHog capture failed (direct charge)");
        }
      })();

      logger.info(
        {
          orderId: order.id,
          paymentId: payment.id,
          paymentIntentId: paymentIntent.id,
          amount: product.price,
        },
        "Direct charge succeeded"
      );

      // Affiliate earning (best-effort, idempotent)
      try {
        await createAffiliateEarningForOrderPayment(payment.id);
      } catch (err) {
        logger.error(
          { error: err, paymentId: payment.id, orderId: order.id, userId },
          "Failed to create affiliate earning for direct charge (ignored)"
        );
      }

      // 发送 Lark 支付通知（异步，不阻塞主流程）
      setImmediate(() => {
        void (async () => {
          try {
            // 查询用户统计
            const [userStats, userOrders] = await Promise.all([
              db.user.findUnique({
                where: { id: userId },
                select: {
                  name: true,
                  email: true,
                  utmSource: true,
                  utmMedium: true,
                  utmCampaign: true,
                  referredBy: { select: { name: true, email: true } },
                },
              }),
              db.order.aggregate({
                where: { userId, status: "FULFILLED" },
                _count: true,
                _sum: { amount: true },
              }),
            ]);

            asyncSendPaymentNotification({
              userName: userStats?.name ?? userStats?.email ?? userId,
              userEmail: userStats?.email ?? undefined,
              amountCents: product.price,
              currency: product.currency,
              productName: product.name,
              orderId: order.id,
              paymentId: payment.id,
              gatewayTransactionId: paymentIntent.id,
              gateway: "stripe",
              status: "succeeded",
              isTest: process.env.NODE_ENV !== "production",
              credits: product.creditsPackage?.creditsAmount,
              originalAmountCents: product.originalPrice ?? undefined,
              utm: {
                source: userStats?.utmSource ?? undefined,
                medium: userStats?.utmMedium ?? undefined,
                campaign: userStats?.utmCampaign ?? undefined,
              },
              userStats: {
                isFirstOrder: userOrders._count <= 1,
                totalSpentCents: userOrders._sum.amount ?? 0,
              },
              referredBy: userStats?.referredBy
                ? { name: userStats.referredBy.name ?? undefined, email: userStats.referredBy.email ?? undefined }
                : undefined,
            });
          } catch (notifyErr) {
            logger.error(
              { error: notifyErr, orderId: order.id },
              "Failed to send direct charge payment notification"
            );
          }
        })();
      });

        return {
          success: true,
          orderId: order.id,
          paymentId: payment.id,
        };
      } else if (paymentIntent.status === "requires_action") {
        // 需要用户参与（如 3DS）。当前前端并不支持在直扣款路径里完成该流程，
        // 因此这里将其视为“直扣款失败”，让上层 checkout() 回退到 Stripe Checkout（hosted）去完成验证。
        await db.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
        await db.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });

        return {
          success: false,
          error: "REQUIRES_ACTION",
          orderId: order.id,
          paymentId: payment.id,
        };
      } else {
        await db.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
        await db.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });

        // NOTE:
        // Direct-charge is an optimization. Any failure here should fall back to hosted checkout.
        // So we intentionally DO NOT send "payment failed" notifications for this branch to avoid alert noise.

        return {
          success: false,
          error: `Payment intent status: ${paymentIntent.status}`,
        };
      }
    } catch (error) {
      logger.error(
        { error, orderId: order.id, paymentId: payment.id },
        "Direct charge failed"
      );

      // Stripe 已扣款成功但后续逻辑失败：不要把 payment/order 标记为失败，也不要让上层 checkout 回退再次扣款。
      // 保持 payment 为 PENDING + 已写入 gatewayTransactionId，交由 success page 的 confirmPayment 兜底完成履约/结算。
      if (stripeChargeSucceeded && orderId && paymentId) {
        if (paymentIntentId) {
          await db.payment
            .updateMany({
              where: { id: paymentId, userId, status: "PENDING" },
              data: { gatewayTransactionId: paymentIntentId },
            })
            .catch(() => undefined);
        }
        return { success: true, orderId, paymentId };
      }

      await db.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
      await db.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // NOTE:
    // - Card declines / insufficient funds / requires_payment_method are expected and will fall back to hosted checkout.
    //   Do NOT send "payment failed" notifications (noise).
    // - Only notify on unexpected, non-card errors (e.g. provider outage).
    const errObj = error as { message?: unknown; code?: unknown; decline_code?: unknown; type?: unknown };
    const isCardError =
      (typeof errObj?.type === "string" && errObj.type === "card_error") ||
      (typeof errObj?.code === "string" && errObj.code === "card_declined") ||
      typeof errObj?.decline_code === "string";

    if (!isCardError) {
      setImmediate(() => {
        const lines: string[] = [];
        if (typeof errObj?.message === "string") lines.push(`- message: ${errObj.message}`);
        if (typeof errObj?.code === "string") lines.push(`- code: ${errObj.code}`);
        if (typeof errObj?.decline_code === "string") lines.push(`- decline_code: ${errObj.decline_code}`);
        if (typeof errObj?.type === "string") lines.push(`- type: ${errObj.type}`);
        const failureReason = lines.length ? `Stripe direct charge failed\n${lines.join("\n")}` : errorMessage;

        asyncSendPaymentNotification({
          userName: user.name ?? user.email ?? userId,
          userEmail: user.email ?? undefined,
          amountCents: product.price,
          currency: product.currency,
          productName: product.name,
          orderId: order.id,
          paymentId: payment.id,
          gateway: "stripe",
          status: "failed",
          failureReason,
          isTest: process.env.NODE_ENV !== "production",
          utm: {
            source: user.utmSource ?? undefined,
            medium: user.utmMedium ?? undefined,
            campaign: user.utmCampaign ?? undefined,
          },
          originalAmountCents: product.originalPrice ?? undefined,
        });
      });
    }

      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error) {
    logger.error(
      { error, userId, productId: product?.id, orderId, paymentId },
      "Direct charge: unexpected error (swallowed)"
    );

    // If Stripe already charged successfully, DO NOT fallback to Checkout (avoid double charge).
    if (stripeChargeSucceeded && orderId && paymentId) {
      return { success: true, orderId, paymentId };
    }

    // Best-effort: if we created rows, mark them as failed/cancelled to avoid dangling PENDING.
    if (paymentId) {
      await db.payment
        .updateMany({ where: { id: paymentId, userId, status: "PENDING" }, data: { status: "FAILED" } })
        .catch(() => undefined);
    }
    if (orderId) {
      await db.order
        .updateMany({ where: { id: orderId, userId, status: "PENDING" }, data: { status: "CANCELLED" } })
        .catch(() => undefined);
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      orderId,
      paymentId,
      error: errorMessage,
    };
  }
}

