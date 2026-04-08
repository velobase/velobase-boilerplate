import type Stripe from "stripe";
import { db } from "@/server/db";
import { getStripeClient } from "../providers/stripe";
import { isStripeNoSuchCustomerError } from "./stripe/stripe-error-utils";

/**
 * 获取用户在 Stripe 上保存的默认支付方式
 */
export async function getDefaultPaymentMethod(
  userId: string
): Promise<{ id: string; brand: string; last4: string } | null> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const stripeCustomerId = (user as { stripeCustomerId?: string | null })
    ?.stripeCustomerId;
  if (!stripeCustomerId) return null;

  const stripe = getStripeClient();

  // 获取 Customer 的默认支付方式
  let activeCustomer: Stripe.Customer;
  try {
    const customerResponse = await stripe.customers.retrieve(stripeCustomerId);
    if ("deleted" in customerResponse && customerResponse.deleted) return null;
    activeCustomer = customerResponse as Stripe.Customer;
  } catch (err) {
    if (isStripeNoSuchCustomerError(err)) {
      // Stored customerId is invalid under current Stripe key/mode.
      // Treat as "no saved card" to allow checkout fallback, and clear the invalid id.
      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: null },
      });
      return null;
    }
    throw err;
  }
  const defaultPmId =
    typeof activeCustomer.invoice_settings?.default_payment_method === "string"
      ? activeCustomer.invoice_settings.default_payment_method
      : activeCustomer.invoice_settings?.default_payment_method?.id;

  if (defaultPmId) {
    const pm = await stripe.paymentMethods.retrieve(defaultPmId);
    if (pm.card) {
      return {
        id: pm.id,
        brand: pm.card.brand ?? "unknown",
        last4: pm.card.last4 ?? "****",
      };
    }
  }

  // 如果没有默认卡，尝试获取第一张卡
  let paymentMethods;
  try {
    paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
      limit: 1,
    });
  } catch (err) {
    if (isStripeNoSuchCustomerError(err)) {
      await db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: null },
      });
      return null;
    }
    throw err;
  }

  if (paymentMethods.data.length > 0) {
    const pm = paymentMethods.data[0];
    if (pm?.card) {
      return {
        id: pm.id,
        brand: pm.card.brand ?? "unknown",
        last4: pm.card.last4 ?? "****",
      };
    }
  }

  return null;
}

