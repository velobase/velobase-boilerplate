import { z } from "zod";

// Stripe webhook schemas
export const stripeCheckoutSessionSchema = z.object({
  id: z.string(),
  object: z.literal("checkout.session"),
  payment_intent: z.string().nullable(),
  subscription: z.string().nullable(),
  metadata: z.object({
    orderId: z.string().optional(),
    paymentId: z.string().optional(),
  }).optional(),
});

export const stripePaymentIntentSchema = z.object({
  id: z.string(),
  object: z.literal("payment_intent"),
  status: z.string(),
  // Needed for better failure diagnostics and mapping back to our DB rows
  metadata: z.record(z.string()).optional(),
  last_payment_error: z
    .object({
      message: z.string().optional().nullable(),
      type: z.string().optional().nullable(),
      code: z.string().optional().nullable(),
      decline_code: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const stripeSubscriptionSchema = z.object({
  id: z.string(),
  object: z.literal("subscription"),
  status: z.enum([
    "active",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "past_due",
    "trialing",
    "unpaid",
  ]),
  // Cancellation-related fields (optional because not all webhook payloads include them)
  cancel_at_period_end: z.boolean().optional(),
  cancel_at: z.number().nullable().optional(),
  canceled_at: z.number().nullable().optional(),
  ended_at: z.number().nullable().optional(),
  current_period_start: z.number().nullable().optional(),
  current_period_end: z.number().nullable().optional(),
});

// Waffo webhook schemas
export const waffoPaymentWebhookSchema = z.object({
  status: z.string(),
  transaction_id: z.string().optional(),
  subscription_id: z.string().optional(),
  subscription_period: z.number().optional(),
  amount_cents: z.number().optional(),
  currency: z.string().optional(),
});

export const waffoSubscriptionWebhookSchema = z.object({
  subscription_status: z.string(),
  subscription_id: z.string(),
});

