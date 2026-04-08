import { getStripeClient } from "../../providers/stripe";
import { db } from "@/server/db";
import { logger } from "@/server/shared/telemetry/logger";
import { isStripeNoSuchCustomerError } from "./stripe-error-utils";

interface ChargeSavedCardParams {
  userId: string;
  amount: number;        // 单位：分（99 = $0.99）
  currency: string;      // "usd"
  productId: string;
  metadata?: Record<string, string>;
}

interface ChargeSavedCardResult {
  success: true;
  paymentIntentId: string;
}

/**
 * 使用用户已保存的卡进行后台扣款（off_session）
 * 
 * 前提条件：
 * 1. 用户必须有 stripeCustomerId
 * 2. 该 Customer 下必须有保存的支付方式（PaymentMethod）
 * 
 * @throws Error("NO_SAVED_CARD") - 用户没有保存的卡
 * @throws Error("PAYMENT_FAILED") - 扣款失败（卡失效、余额不足等）
 */
export async function chargeWithSavedCard({
  userId,
  amount,
  currency,
  productId,
  metadata,
}: ChargeSavedCardParams): Promise<ChargeSavedCardResult> {
  const stripe = getStripeClient();

  // 1. 获取用户的 Stripe Customer ID
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true },
  });

  if (!user?.stripeCustomerId) {
    logger.warn({ userId }, "User has no stripeCustomerId, cannot charge saved card");
    throw new Error("NO_SAVED_CARD");
  }

  // 2. 获取该 Customer 的支付方式
  let paymentMethods;
  try {
    paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: "card",
    });
  } catch (err) {
    if (isStripeNoSuchCustomerError(err)) {
      logger.warn(
        { userId, stripeCustomerId: user.stripeCustomerId },
        "Stripe customer not found (mode mismatch). Clearing stripeCustomerId and treating as NO_SAVED_CARD"
      );
      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: null },
      });
      throw new Error("NO_SAVED_CARD");
    }
    throw err;
  }

  if (paymentMethods.data.length === 0) {
    logger.warn({ userId, stripeCustomerId: user.stripeCustomerId }, "Customer has no saved payment methods");
    throw new Error("NO_SAVED_CARD");
  }

  // 使用第一个（最近的）支付方式
  const paymentMethod = paymentMethods.data[0]!;

  logger.info({
    userId,
    amount,
    currency,
    productId,
    paymentMethodId: paymentMethod.id,
    cardLast4: paymentMethod.card?.last4,
  }, "Attempting off-session charge with saved card");

  // 3. 创建 PaymentIntent 并立即确认（后台扣款）
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: user.stripeCustomerId,
      payment_method: paymentMethod.id,
      off_session: true,  // 用户不在场
      confirm: true,      // 立即扣款
      metadata: {
        userId,
        productId,
        source: "quick_purchase",
        ...metadata,
      },
      // 收据邮件
      receipt_email: user.email ?? undefined,
    });

    if (paymentIntent.status === "succeeded") {
      logger.info({
        userId,
        paymentIntentId: paymentIntent.id,
        amount,
      }, "Off-session charge succeeded");

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
      };
    }

    // 如果状态不是 succeeded，可能需要额外认证（3DS）
    // 这种情况下我们不能后台扣款，需要用户参与
    logger.warn({
      userId,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    }, "Off-session charge requires additional authentication");

    throw new Error("REQUIRES_ACTION");

  } catch (err) {
    // Stripe 特定错误处理
    if (err instanceof Error && err.message === "REQUIRES_ACTION") {
      throw err;
    }

    if (isStripeNoSuchCustomerError(err)) {
      logger.warn(
        { userId, stripeCustomerId: user.stripeCustomerId },
        "Stripe customer not found while creating PaymentIntent. Clearing stripeCustomerId and treating as NO_SAVED_CARD"
      );
      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: null },
      });
      throw new Error("NO_SAVED_CARD");
    }

    const stripeError = err as { type?: string; code?: string; message?: string };
    
    logger.error({
      userId,
      error: stripeError.message,
      code: stripeError.code,
      type: stripeError.type,
    }, "Off-session charge failed");

    // 常见失败原因：
    // - card_declined: 卡被拒
    // - expired_card: 卡过期
    // - insufficient_funds: 余额不足
    throw new Error("PAYMENT_FAILED");
  }
}

/**
 * 检查用户是否有保存的支付方式
 */
export async function hasSavedPaymentMethod(userId: string): Promise<boolean> {
  const stripe = getStripeClient();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return false;
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: user.stripeCustomerId,
    type: "card",
    limit: 1,
  });

  return paymentMethods.data.length > 0;
}

/**
 * 获取用户保存的卡信息（用于前端展示）
 */
export async function getSavedCardInfo(userId: string): Promise<{
  hasCard: boolean;
  last4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
} | null> {
  const stripe = getStripeClient();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return { hasCard: false };
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: user.stripeCustomerId,
    type: "card",
    limit: 1,
  });

  if (paymentMethods.data.length === 0) {
    return { hasCard: false };
  }

  const card = paymentMethods.data[0]!.card;
  return {
    hasCard: true,
    last4: card?.last4,
    brand: card?.brand,
    expMonth: card?.exp_month,
    expYear: card?.exp_year,
  };
}

