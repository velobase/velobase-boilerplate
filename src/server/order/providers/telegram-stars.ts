/**
 * Telegram Stars payment provider.
 *
 * Unlike Stripe/NowPayments, Telegram Stars payments are handled entirely
 * within the Telegram Bot conversation. The bot-handler.ts handles the full
 * lifecycle (invoice → pre_checkout → successful_payment → fulfillment).
 *
 * This provider exists mainly for consistency with the provider registry pattern.
 * - createPayment: returns a deep link to the bot (for web → Telegram flow)
 * - handlePaymentWebhook: not used (handled by bot-handler instead)
 */

import type { PaymentProvider, ProviderOrder, ProviderPayment } from "./types";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export const telegramStarsProvider: PaymentProvider = {
  async createPayment({ payment, order: _order }: { payment: ProviderPayment; order: ProviderOrder }) {
    // For Telegram Stars, the "payment URL" is a deep link to the bot
    // that triggers the invoice flow.
    // The bot will handle: sendInvoice → pre_checkout → successful_payment → fulfillment
    const botUsername = BOT_USERNAME;
    if (!botUsername) {
      throw new Error("NEXT_PUBLIC_TELEGRAM_BOT_USERNAME is required for Telegram Stars payments");
    }

    // Deep link: opens the bot and sends /start buy_<productId>
    // But we want to include the paymentId, so we use a custom payload
    const startParam = `pay_${payment.id}`;
    const paymentUrl = `https://t.me/${botUsername}?start=${startParam}`;

    return {
      paymentUrl,
    };
  },

  async createSubscription({ payment, order }: { payment: ProviderPayment; order: ProviderOrder }) {
    // Telegram Stars doesn't support recurring subscriptions natively.
    // Same as one-time payment; user must manually renew.
    return this.createPayment({ payment, order });
  },

  async handlePaymentWebhook(_req: Request) {
    // Telegram Stars payments are handled directly by the bot handler
    // (src/server/telegram/bot-handler.ts), not via a traditional webhook.
    // This method is not called for Telegram Stars.
    return null;
  },

  async handleSubscriptionWebhook() {
    return null;
  },

  async confirmPayment(_params: { checkoutSessionId?: string; gatewayTransactionId?: string }) {
    // For Telegram Stars, we can check if the payment has been marked as SUCCEEDED
    // by the bot handler. The gatewayTransactionId is the telegram_payment_charge_id.
    // Since the bot handler directly updates the DB, we can just check the DB status.
    return { isPaid: false };
  },
};
