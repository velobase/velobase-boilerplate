import { getStripe } from "./client";
import type Stripe from "stripe";

export async function verifyStripeWebhook(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  try {
    const event = getStripe().webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    return event;
  } catch (error) {
    console.error("Webhook verification failed:", error);
    throw new Error("Invalid webhook signature");
  }
}

