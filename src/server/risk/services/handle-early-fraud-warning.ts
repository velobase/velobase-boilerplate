import { db } from "@/server/db";
import { getStripeClient } from "@/server/order/providers/stripe";
import { logger } from "@/server/shared/telemetry/logger";
import { getLarkBot } from "@/lib/lark";
import { LARK_CHAT_IDS } from "@/lib/lark/constants";
import type { LarkCard } from "@/lib/lark/types";
import type Stripe from "stripe";

export async function handleEarlyFraudWarning(warning: Stripe.Radar.EarlyFraudWarning) {
  const stripe = getStripeClient();
  const chargeId =
    typeof warning.charge === "string" ? warning.charge : warning.charge?.id;
  const paymentIntentId =
    typeof warning.payment_intent === "string"
      ? warning.payment_intent
      : warning.payment_intent?.id;

  logger.warn(
    {
      warningId: warning.id,
      chargeId,
      paymentIntentId,
      fraudType: warning.fraud_type,
      actionable: warning.actionable,
    },
    "Processing Early Fraud Warning (EFW)"
  );

  // 1. 尝试找到关联的本地支付记录和用户
  let payment = null;
  if (paymentIntentId) {
    payment = await db.payment.findFirst({
      where: { gatewayTransactionId: paymentIntentId },
      include: { user: true },
    });
  }

  // Fallback A: 如果本地还没写入 gatewayTransactionId（例如订阅 checkout 还没落库/乱序），
  // 通过 payment_intent -> checkout.session -> metadata.paymentId/orderId 反查本地 Payment
  if (!payment && paymentIntentId) {
    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1,
      });
      const s = sessions.data?.[0];
      const meta = (s?.metadata ?? null) as { paymentId?: string; orderId?: string } | null;
      if (meta?.paymentId) {
        payment = await db.payment.findUnique({
          where: { id: meta.paymentId },
          include: { user: true },
        });
      }
      if (!payment && meta?.orderId) {
        payment = await db.payment.findFirst({
          where: { orderId: meta.orderId },
          orderBy: { createdAt: "desc" },
          include: { user: true },
        });
      }
      logger.info(
        { warningId: warning.id, paymentIntentId, found: !!payment, sessionId: s?.id, metadata: meta },
        "EFW: Stripe checkout.session fallback lookup"
      );
    } catch (e) {
      logger.warn({ error: e, paymentIntentId }, "EFW: Stripe checkout.session fallback lookup failed (ignored)");
    }
  }

  // 如果找不到，尝试通过 charge -> payment_intent 反查（少量情况下 EFW 可能只带 charge）
  if (!payment && !paymentIntentId && chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      const pi =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (pi) {
        payment = await db.payment.findFirst({
          where: { gatewayTransactionId: pi },
          include: { user: true },
        });
      }
    } catch (e) {
      logger.error({ error: e, chargeId }, "EFW: Failed to retrieve charge for lookup");
    }
  }

  // 2. 执行退款 (Refund) - 核心止损（强幂等：以 warning.id 作为 Stripe idempotency key）
  // 临时关闭自动退款，改为人工审核后决定是否退款
  const SKIP_AUTO_REFUND = true;
  if (SKIP_AUTO_REFUND) {
    logger.info({ warningId: warning.id, chargeId, paymentIntentId }, "EFW: Auto refund disabled, skipping refund");
  }

  // 优先使用 charge 退款（更可靠，也便于检查 amount_refunded），没有 charge 才退 PI 的 latest_charge
  if (!SKIP_AUTO_REFUND) {
    const idempotencyKey = `efw_${warning.id}`;

    const refundByChargeId = async (targetChargeId: string) => {
      const charge = await stripe.charges.retrieve(targetChargeId);
      if ((charge.amount_refunded ?? 0) >= charge.amount) {
        logger.info({ chargeId: targetChargeId }, "EFW: Charge already fully refunded");
        return;
      }
      await stripe.refunds.create(
        {
          charge: targetChargeId,
          reason: "fraudulent",
          metadata: {
            reason: "triggered_by_efw_automation",
            warning_id: warning.id,
          },
        },
        { idempotencyKey }
      );
      logger.info({ chargeId: targetChargeId }, "EFW: Refund issued successfully");
    };

    try {
      if (chargeId) {
        await refundByChargeId(chargeId);
      } else if (paymentIntentId) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ["latest_charge"],
        });
        const latestCharge =
          typeof pi.latest_charge === "string"
            ? pi.latest_charge
            : pi.latest_charge?.id;
        if (!latestCharge) {
          logger.warn({ paymentIntentId }, "EFW: PaymentIntent has no latest_charge; skip refund");
        } else {
          await refundByChargeId(latestCharge);
        }
      } else {
        logger.warn({ warningId: warning.id }, "EFW: Missing both charge and payment_intent; skip refund");
      }
    } catch (error) {
      // 对"已退款/不可退款"的错误视为幂等成功；其它错误抛出让上层决定是否触发 Stripe 重试
      const e = error as { code?: string; message?: string; type?: string };
      const msg = e?.message ?? "";
      const code = e?.code ?? "";
      const looksIdempotent =
        code === "charge_already_refunded" ||
        code === "refund_charge_already_refunded" ||
        msg.toLowerCase().includes("already been refunded");
      if (looksIdempotent) {
        logger.info({ code, msg }, "EFW: Refund already exists, treat as success");
      } else {
        logger.error({ error, warningId: warning.id }, "EFW: Refund failed");
        throw error;
      }
    }
  }

  // 3. 封禁用户 & 取消订阅 (Ban & Cancel)
  const resolvedUserId = (() => {
    if (payment?.userId) return payment.userId;
    return null;
  })();

  // Fallback B: 如果没找到 Payment，也尝试通过 Stripe CustomerId 定位 User（User.stripeCustomerId）
  let userIdByCustomer: string | null = null;
  if (!resolvedUserId) {
    try {
      // 优先用 charge 拿 customer
      if (chargeId) {
        const charge = await stripe.charges.retrieve(chargeId);
        const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
        if (customerId) {
          const user = await db.user.findFirst({
            where: { stripeCustomerId: customerId },
            select: { id: true },
          });
          userIdByCustomer = user?.id ?? null;
        }
      } else if (paymentIntentId) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer?.id;
        if (customerId) {
          const user = await db.user.findFirst({
            where: { stripeCustomerId: customerId },
            select: { id: true },
          });
          userIdByCustomer = user?.id ?? null;
        }
      }
    } catch (e) {
      logger.warn({ error: e, warningId: warning.id }, "EFW: Failed to resolve user by Stripe customer (ignored)");
    }
  }

  const userId = resolvedUserId ?? userIdByCustomer;

  if (userId) {

    try {
      // 3.1 封禁用户
      await db.user.update({
        where: { id: userId },
        data: {
          isBlocked: true,
          blockedReason: "FRAUD_EFW",
          blockedAt: new Date(),
        },
      });
      logger.info({ userId }, "EFW: User blocked");

      // 3.2 查找并取消该用户所有活跃订阅
      const subscriptions = await db.userSubscription.findMany({
        where: {
          userId: userId,
          status: { in: ["ACTIVE", "PAST_DUE"] },
        },
      });

      for (const sub of subscriptions) {
        if (sub.gatewaySubscriptionId) {
          try {
            // 立即删除订阅（立即生效，不等待周期结束）
            await stripe.subscriptions.cancel(sub.gatewaySubscriptionId, {
              prorate: false, // 欺诈用户不退还剩余价值
            });
            
            // 更新本地状态
            await db.userSubscription.update({
              where: { id: sub.id },
              data: { status: "CANCELED", canceledAt: new Date(), endedAt: new Date() },
            });
            
            logger.info(
              { subscriptionId: sub.id, stripeSubId: sub.gatewaySubscriptionId },
              "EFW: Subscription canceled"
            );
          } catch (err) {
            logger.error({ err, subscriptionId: sub.id }, "EFW: Failed to cancel subscription");
          }
        }
      }

    } catch (error) {
      logger.error({ error, userId }, "EFW: Failed to block user or cancel subscriptions");
    }
  } else {
    logger.warn({ warningId: warning.id }, "EFW: User not found in local DB, skipped blocking");
  }

  // 4. 发送飞书群通知
  await sendEfwLarkNotification({
    warningId: warning.id,
    fraudType: warning.fraud_type,
    chargeId,
    paymentIntentId,
    userId,
    userEmail: payment?.user?.email ?? undefined,
    amountCents: payment?.amount ?? undefined,
    currency: payment?.currency ?? undefined,
  });
}

// ============================================================================
// 飞书通知
// ============================================================================

interface EfwNotificationData {
  warningId: string;
  fraudType: string;
  chargeId?: string;
  paymentIntentId?: string;
  userId?: string | null;
  userEmail?: string;
  amountCents?: number;
  currency?: string;
}

function buildEfwCard(data: EfwNotificationData): LarkCard {
  const amountDisplay =
    data.amountCents != null && data.currency
      ? `${(data.amountCents / 100).toFixed(2)} ${data.currency.toUpperCase()}`
      : "Unknown";

  const stripeChargeUrl = data.chargeId
    ? `https://dashboard.stripe.com/payments/${data.chargeId}`
    : data.paymentIntentId
      ? `https://dashboard.stripe.com/payments/${data.paymentIntentId}`
      : undefined;

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: "plain_text", content: "🚨 Early Fraud Warning (EFW)" },
      template: "red",
    },
    elements: [
      {
        tag: "div",
        fields: [
          {
            is_short: true,
            text: { tag: "lark_md", content: `**Warning ID**\n${data.warningId}` },
          },
          {
            is_short: true,
            text: { tag: "lark_md", content: `**Fraud Type**\n${data.fraudType}` },
          },
          {
            is_short: true,
            text: { tag: "lark_md", content: `**Amount**\n${amountDisplay}` },
          },
          {
            is_short: true,
            text: {
              tag: "lark_md",
              content: `**User**\n${data.userEmail ?? data.userId ?? "Unknown"}`,
            },
          },
        ],
      },
      { tag: "hr" },
      {
        tag: "markdown",
        content: `**自动处理结果:**\n⏸️ 自动退款已关闭，需人工审核\n${data.userId ? "✅ 用户已封禁 (isBlocked=true)\n✅ 订阅已取消" : "⚠️ 未找到用户，跳过封禁"}`,
      },
      ...(stripeChargeUrl
        ? [
            {
              tag: "action" as const,
              actions: [
                {
                  tag: "button" as const,
                  text: { tag: "plain_text" as const, content: "在 Stripe 查看" },
                  url: stripeChargeUrl,
                  type: "primary" as const,
                },
              ],
            },
          ]
        : []),
    ],
  };
}

async function sendEfwLarkNotification(data: EfwNotificationData): Promise<void> {
  try {
    const bot = getLarkBot();
    const card = buildEfwCard(data);
    await bot.sendCard(LARK_CHAT_IDS.DISPUTE, card);
    logger.info({ warningId: data.warningId }, "EFW: Lark notification sent to dispute group");
  } catch (error) {
    logger.error({ error, warningId: data.warningId }, "EFW: Failed to send Lark notification");
  }
}

