import { env } from "@/env";

export { env };

export const getStripeSecretKey = () => {
  return env.STRIPE_SECRET_KEY ?? "";
};

export const getStripeWebhookSecret = () => {
  return env.STRIPE_WEBHOOK_SECRET ?? "";
};

export const getAirwallexClientId = () => {
  return env.AIRWALLEX_CLIENT_ID;
};

export const getAirwallexApiKey = () => {
  return env.AIRWALLEX_API_KEY;
};

export const getAirwallexWebhookSecret = () => {
  return env.AIRWALLEX_WEBHOOK_SECRET;
};

export const getAirwallexAccountId = () => {
  return env.AIRWALLEX_ACCOUNT_ID;
};

export const getAirwallexEnv = () => {
  return env.AIRWALLEX_ENV;
};

export const getAirwallexBaseUrl = () => {
  return env.AIRWALLEX_BASE_URL ?? "";
};
