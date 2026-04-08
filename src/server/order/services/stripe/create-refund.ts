import { stripe } from "./client";
import type Stripe from "stripe";

interface CreateRefundParams {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

export async function createStripeRefund({
  paymentIntentId,
  amount,
  reason,
}: CreateRefundParams) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
      reason: reason as Stripe.RefundCreateParams.Reason | undefined,
    });

    return refund;
  } catch (error) {
    console.error("Failed to create Stripe refund:", error);
    throw new Error("Failed to create refund");
  }
}

