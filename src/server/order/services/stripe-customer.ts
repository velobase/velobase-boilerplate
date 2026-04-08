import Stripe from "stripe";
import { db } from "@/server/db";
import { getStripeSecretKey } from "@/server/shared/env";
import { asyncSendBackendAlert } from "@/lib/lark";
import { isStripeNoSuchCustomerError } from "./stripe/stripe-error-utils";

// Local Stripe client for customer management
let stripe: Stripe | null = null;

function getStripeClient(): Stripe {
  stripe ??= new Stripe(getStripeSecretKey(), {
    apiVersion: "2025-09-30.clover",
  });
  return stripe;
}

/**
 * Get or create a Stripe Customer for a given user.
 *
 * - If User.stripeCustomerId exists, reuse it.
 * - Otherwise, create a new Stripe customer and persist the ID.
 */
export async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    // 不使用强类型选择 stripeCustomerId，避免在未重新生成 Prisma Client 时的类型错误
  });

  if (!user) {
    throw new Error("User not found");
  }

  // 访问 stripeCustomerId 字段
  const existingStripeCustomerId = (user as { stripeCustomerId?: string | null }).stripeCustomerId;
  if (existingStripeCustomerId) {
    // Validate the stored customer ID actually exists under the current Stripe key/mode.
    // If it doesn't, clear and recreate to unblock checkout/setup-intent flows.
    try {
      const existing = await getStripeClient().customers.retrieve(existingStripeCustomerId);
      if (!existing.deleted) {
        return existingStripeCustomerId;
      }
    } catch (err) {
      if (!isStripeNoSuchCustomerError(err)) {
        throw err;
      }
    }

    // Stored customerId is invalid for current Stripe environment (e.g. live vs test mismatch)
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: null },
    });

    asyncSendBackendAlert({
      title: "Stripe customerId 无效，已清空并重建",
      severity: "warning",
      source: "api",
      environment: process.env.NODE_ENV,
      service: "stripe",
      resourceId: existingStripeCustomerId,
      user: user.email ?? user.id,
      errorName: "StripeNoSuchCustomer",
      errorMessage: `Invalid Stripe customerId detected for user ${user.id}. Cleared and recreating.`,
      metadata: {
        userId: user.id,
        stripeCustomerId: existingStripeCustomerId,
      },
    });
  }

  const client = getStripeClient();

  const customer = await client.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: {
      userId: user.id,
    },
  });

  await db.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}


