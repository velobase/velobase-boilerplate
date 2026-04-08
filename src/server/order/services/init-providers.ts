import { registerProvider } from "../providers/registry";
import { stripeProvider } from "../providers/stripe";
import { waffoProvider } from "../providers/waffo";
import { nowpaymentsProvider } from "../providers/nowpayments";
import { airwallexProvider } from "../providers/airwallex";
import { telegramStarsProvider } from "../providers/telegram-stars";
import { env } from "@/server/shared/env";

export function initOrderProviders() {
  if (env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET) {
    registerProvider("STRIPE", stripeProvider);
  }
  if (env.AIRWALLEX_CLIENT_ID && env.AIRWALLEX_API_KEY) {
    registerProvider("AIRWALLEX", airwallexProvider);
  }
  if (env.NOWPAYMENTS_API_KEY && env.NOWPAYMENTS_IPN_SECRET) {
    registerProvider("NOWPAYMENTS", nowpaymentsProvider);
  }
  if (env.TELEGRAM_BOT_TOKEN) {
    registerProvider("TELEGRAM_STARS", telegramStarsProvider);
  }
  // waffo 常驻注册（仅 webhook）
  registerProvider("WAFFO", waffoProvider);
}


