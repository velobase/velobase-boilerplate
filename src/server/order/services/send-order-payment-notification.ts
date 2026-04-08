import { db } from "@/server/db";
import { asyncSendPaymentNotification } from "@/lib/lark";
import type { PaymentNotification } from "@/lib/lark";
import { logger } from "@/server/shared/telemetry/logger";

function mapGateway(gateway: string | null | undefined): PaymentNotification["gateway"] {
  switch ((gateway ?? "").toUpperCase()) {
    case "STRIPE":
      return "stripe";
    case "AIRWALLEX":
      return "airwallex";
    case "NOWPAYMENTS":
      return "nowpayments";
    case "WAFFO":
      return "waffo";
    default:
      return "other";
  }
}

function buildNowPaymentsFields(payment: {
  extra: unknown;
  gatewayResponse: unknown;
  gatewayTransactionId: string | null;
}): PaymentNotification["nowpayments"] | undefined {
  const extra = payment.extra as { nowpayments?: Record<string, unknown> } | null;
  const np = extra?.nowpayments as
    | {
        payment_id?: unknown;
        payment_status?: unknown;
        pay_address?: unknown;
        pay_amount?: unknown;
        pay_currency?: unknown;
        payin_hash?: unknown;
        payout_hash?: unknown;
        price_amount?: unknown;
        price_currency?: unknown;
      }
    | undefined;

  const raw = payment.gatewayResponse as Record<string, unknown> | null;

  return {
    payment_id:
      typeof np?.payment_id === "string"
        ? np.payment_id
        : typeof raw?.payment_id === "string"
          ? raw.payment_id
          : payment.gatewayTransactionId ?? undefined,
    payment_status:
      typeof np?.payment_status === "string"
        ? np.payment_status
        : typeof raw?.payment_status === "string"
          ? raw.payment_status
          : undefined,
    pay_address:
      typeof np?.pay_address === "string"
        ? np.pay_address
        : typeof raw?.pay_address === "string"
          ? raw.pay_address
          : undefined,
    pay_amount:
      typeof np?.pay_amount === "number" || typeof np?.pay_amount === "string"
        ? np.pay_amount
        : typeof raw?.pay_amount === "number" || typeof raw?.pay_amount === "string"
          ? raw.pay_amount
          : undefined,
    pay_currency:
      typeof np?.pay_currency === "string"
        ? np.pay_currency
        : typeof raw?.pay_currency === "string"
          ? raw.pay_currency
          : undefined,
    payin_hash:
      typeof np?.payin_hash === "string"
        ? np.payin_hash
        : typeof raw?.payin_hash === "string"
          ? raw.payin_hash
          : undefined,
    payout_hash:
      typeof np?.payout_hash === "string"
        ? np.payout_hash
        : typeof raw?.payout_hash === "string"
          ? raw.payout_hash
          : undefined,
    price_amount:
      typeof np?.price_amount === "number" || typeof np?.price_amount === "string"
        ? np.price_amount
        : typeof raw?.price_amount === "number" || typeof raw?.price_amount === "string"
          ? raw.price_amount
          : undefined,
    price_currency:
      typeof np?.price_currency === "string"
        ? np.price_currency
        : typeof raw?.price_currency === "string"
          ? raw.price_currency
          : undefined,
  };
}

/**
 * 统一的「订单支付成功」通知（Lark/飞书），用于 webhook / confirm / compensation 等多条履约链路。
 *
 * - best-effort: 内部吞掉异常，不影响主流程
 * - fire-and-forget: 通过 asyncSendPaymentNotification 发送
 */
export async function sendOrderPaymentNotificationByPaymentId(
  paymentId: string,
  meta?: { source?: "webhook" | "confirm" | "compensation" }
): Promise<void> {
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            product: { include: { creditsPackage: true } },
            user: {
              include: {
                referredBy: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!payment?.orderId || !payment.order) {
      logger.warn({ paymentId, source: meta?.source }, "Skip payment notification: order not found for payment");
      return;
    }

    const order = payment.order;
    const userId = order.userId;

    const userOrders = await db.order.aggregate({
      where: {
        userId,
        status: "FULFILLED", // FULFILLED implies paid
      },
      _count: true,
      _sum: { amount: true },
    });

    const isFirstOrder = userOrders._count <= 1; // <= 1 because current order is already fulfilled
    const totalSpentCents = userOrders._sum.amount ?? 0;

    const utm = {
      source: order.user?.utmSource ?? undefined,
      medium: order.user?.utmMedium ?? undefined,
      campaign: order.user?.utmCampaign ?? undefined,
    };

    const productSnapshot = order.productSnapshot as {
      hasTrial?: boolean;
      trialDays?: number | null;
    } | null;
    const isTrial =
      order.product?.type === "SUBSCRIPTION" &&
      !!productSnapshot?.hasTrial &&
      typeof productSnapshot?.trialDays === "number" &&
      productSnapshot.trialDays > 0;

    const gateway = mapGateway(payment.paymentGateway);

    asyncSendPaymentNotification({
      bizType: "order",
      userName: order.user?.name ?? order.user?.email ?? order.userId,
      userEmail: order.user?.email ?? undefined,
      userCountryCode: order.user?.countryCode ?? undefined,
      amountCents: order.amount,
      currency: order.currency,
      productName: order.product?.name ?? "Unknown Product",
      orderId: order.id,
      paymentId: payment.id,
      gatewayTransactionId: payment.gatewayTransactionId ?? undefined,
      gatewaySubscriptionId: payment.gatewaySubscriptionId ?? undefined,
      paymentUrl: payment.paymentUrl ?? undefined,
      gateway,
      nowpayments:
        gateway === "nowpayments"
          ? buildNowPaymentsFields({
              extra: payment.extra,
              gatewayResponse: payment.gatewayResponse,
              gatewayTransactionId: payment.gatewayTransactionId,
            })
          : undefined,
      status: "succeeded",
      isTest: process.env.NODE_ENV !== "production",
      credits: order.product?.creditsPackage?.creditsAmount,
      originalAmountCents: order.product?.originalPrice ?? undefined,
      utm,
      userStats: {
        isFirstOrder,
        totalSpentCents,
      },
      isTrial,
      trialDays: isTrial ? (productSnapshot?.trialDays ?? 7) : undefined,
      referredBy: order.user?.referredBy
        ? { name: order.user.referredBy.name ?? undefined, email: order.user.referredBy.email ?? undefined }
        : undefined,
    });
  } catch (error) {
    logger.error({ error, paymentId, source: meta?.source }, "Failed to send order payment notification (ignored)");
  }
}


