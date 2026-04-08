/**
 * Telegram Bot API wrapper.
 * Uses raw fetch to keep dependencies minimal (same pattern as NowPayments provider).
 */

import { env } from "@/server/shared/env";
import { logger } from "@/server/shared/telemetry/logger";

const log = logger.child({ module: "telegram-bot" });

function requireBotToken(): string {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is required");
  return token;
}

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${requireBotToken()}/${method}`;
}

async function callApi<T = unknown>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) {
    log.error({ method, body, response: json }, "Telegram API error");
    throw new Error(`Telegram API ${method} failed: ${json.description ?? "unknown error"}`);
  }
  return json.result as T;
}

// ─── Types (subset of Telegram Bot API) ───────────────────────────────────

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  successful_payment?: TelegramSuccessfulPayment;
}

export interface TelegramSuccessfulPayment {
  currency: string; // "XTR" for Stars
  total_amount: number; // amount in Stars
  invoice_payload: string; // our custom payload
  telegram_payment_charge_id: string; // Telegram's charge ID
  provider_payment_charge_id: string; // provider's charge ID
}

export interface TelegramPreCheckoutQuery {
  id: string;
  from: TelegramUser;
  currency: string;
  total_amount: number;
  invoice_payload: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  pre_checkout_query?: TelegramPreCheckoutQuery;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
  pay?: boolean;
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramLabeledPrice {
  label: string;
  amount: number; // in Stars (1 star = 1)
}

// ─── Bot API Methods ──────────────────────────────────────────────────────

export async function sendMessage(
  chatId: number | string,
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
    reply_markup?: TelegramInlineKeyboardMarkup;
  },
) {
  return callApi("sendMessage", {
    chat_id: chatId,
    text,
    ...options,
  });
}

export async function answerPreCheckoutQuery(
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string,
) {
  return callApi("answerPreCheckoutQuery", {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    ...(errorMessage ? { error_message: errorMessage } : {}),
  });
}

/**
 * Send an invoice for Telegram Stars payment.
 * Currency must be "XTR" for Stars.
 */
export async function sendInvoice(params: {
  chatId: number | string;
  title: string;
  description: string;
  payload: string; // our custom payload (e.g. JSON with paymentId, orderId)
  prices: TelegramLabeledPrice[];
  /** Suggested tip amounts in Stars */
  suggestedTipAmounts?: number[];
  /** Photo URL for the invoice */
  photoUrl?: string;
  /** Start parameter for deep link (e.g. for inline keyboards) */
  startParameter?: string;
}) {
  return callApi("sendInvoice", {
    chat_id: params.chatId,
    title: params.title,
    description: params.description,
    payload: params.payload,
    currency: "XTR", // Telegram Stars
    prices: params.prices,
    provider_token: "", // empty for Stars
    ...(params.suggestedTipAmounts ? { suggested_tip_amounts: params.suggestedTipAmounts } : {}),
    ...(params.photoUrl ? { photo_url: params.photoUrl } : {}),
    ...(params.startParameter ? { start_parameter: params.startParameter } : {}),
  });
}

/**
 * Set webhook URL for the bot.
 */
export async function setWebhook(url: string, secretToken?: string) {
  return callApi("setWebhook", {
    url,
    ...(secretToken ? { secret_token: secretToken } : {}),
    allowed_updates: ["message", "pre_checkout_query", "callback_query"],
  });
}

/**
 * Get current webhook info.
 */
export async function getWebhookInfo() {
  return callApi<{ url: string; has_custom_certificate: boolean; pending_update_count: number }>(
    "getWebhookInfo",
    {},
  );
}

/**
 * Refund a Telegram Stars payment.
 */
export async function refundStarPayment(userId: number, telegramPaymentChargeId: string) {
  return callApi("refundStarPayment", {
    user_id: userId,
    telegram_payment_charge_id: telegramPaymentChargeId,
  });
}
