import Stripe from "stripe";
import { db } from "@/server/db";
import { getStripeSecretKey } from "@/server/shared/env";
import { logger } from "@/server/shared/telemetry/logger";

let stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  stripe ??= new Stripe(getStripeSecretKey(), {
    apiVersion: "2025-09-30.clover",
  });
  return stripe;
}

interface EarlyConvertTrialParams {
  userId: string;
}

/**
 * Early-convert an active trial subscription to a paid period.
 *
 * - Only supports Stripe subscriptions for now.
 * - Does NOT directly mutate balances; we rely on subsequent Stripe webhooks
 *   (invoice.payment_succeeded + handleStripeSubscriptionRenewal) to:
 *   - create a REGULAR cycle
 *   - grant the 30,000 membership credits
 */
export async function earlyConvertTrial({ userId }: EarlyConvertTrialParams) {
  const subscription = await db.userSubscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    include: {
      cycles: {
        where: { status: "ACTIVE" },
        orderBy: { sequenceNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!subscription) {
    throw new Error("No active subscription found to convert");
  }

  const cycles = subscription.cycles || [];
  const currentCycle = cycles[0] ?? null;
  if (currentCycle?.type !== "TRIAL") {
    throw new Error("No active trial cycle to convert");
  }

  if (!subscription.gatewaySubscriptionId) {
    throw new Error("Subscription missing gatewaySubscriptionId");
  }

  if (!subscription.gateway || subscription.gateway.toUpperCase() !== "STRIPE") {
    throw new Error("Only Stripe subscriptions are supported for early conversion");
  }

  const stripe = getStripeClient();

  logger.info(
    {
      userId,
      subscriptionId: subscription.id,
      gatewaySubscriptionId: subscription.gatewaySubscriptionId,
      trialCycleId: currentCycle.id,
    },
    "Early converting trial subscription via Stripe"
  );

  await stripe.subscriptions.update(subscription.gatewaySubscriptionId, {
    trial_end: "now",
    proration_behavior: "none",
  });

  return { ok: true };
}


