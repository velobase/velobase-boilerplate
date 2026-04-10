import { env } from "@/env";

export { env };

export const getStripeSecretKey = () => {
  return env.STRIPE_SECRET_KEY ?? "";
};

export const getStripeWebhookSecret = () => {
  return env.STRIPE_WEBHOOK_SECRET ?? "";
};
