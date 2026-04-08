/**
 * Telegram Bot update handler.
 *
 * Processes incoming webhook updates:
 * - /start bind_<token> → bind Telegram account
 * - /start bp_<token> → bind account + buy product in one step
 * - /start buy_<productId> → send invoice for a specific product
 * - /start pay_<paymentId> → send invoice for an existing payment
 * - /buy → show available credit packages
 * - pre_checkout_query → validate and approve
 * - successful_payment → trigger order fulfillment
 */

import { db } from "@/server/db";
import { logger } from "@/server/shared/telemetry/logger";
import {
  answerPreCheckoutQuery,
  sendInvoice,
  sendMessage,
  type TelegramUpdate,
  type TelegramInlineKeyboardMarkup,
} from "./api";
import { getStarsPrice } from "./stars-pricing";
import { verifyBindingToken, verifyBindPayToken } from "./binding-token";
import { initOrderProviders } from "@/server/order/services/init-providers";
import { createOrder } from "@/server/order/services/create-order";
import { createPayment } from "@/server/order/services/create-payment";
import type { Prisma } from "@prisma/client";
import { SALES_PAUSED } from "@/config/decommission";

const log = logger.child({ module: "telegram-bot" });

/**
 * Extract paymentId from invoice payload.
 * Supports both new format (bare UUID string) and legacy JSON format.
 */
function extractPaymentId(payload: string): string | null {
  const trimmed = payload.trim();
  // New format: bare paymentId (UUID)
  if (!trimmed.startsWith("{")) return trimmed || null;
  // Legacy JSON format: { paymentId, orderId, ... }
  try {
    const data = JSON.parse(trimmed) as { paymentId?: string };
    return data.paymentId ?? null;
  } catch {
    return null;
  }
}

// ─── Deep Link Binding ────────────────────────────────────────────────────

/**
 * Handle /start command.
 * - /start → welcome message
 * - /start bind_<token> → bind Telegram account to app user
 * - /start buy_<productId> → send invoice for a specific product
 */
async function handleStart(chatId: number, telegramUserId: number, args: string) {
  // Check if user already bound
  const existingUser = await db.user.findFirst({
    where: { telegramId: String(telegramUserId) },
    select: { id: true, name: true, email: true },
  });

  if (args.startsWith("bind_")) {
    const token = args.slice(5);
    return handleBindAccount(chatId, telegramUserId, token, existingUser);
  }

  // Combined bind + pay: bp_<token> (token embeds both userId and productId)
  if (args.startsWith("bp_")) {
    const token = args.slice(3);
    return handleBindAndPay(chatId, telegramUserId, token, existingUser);
  }

  if (args.startsWith("buy_")) {
    if (SALES_PAUSED) {
      await sendMessage(chatId, "Sales are currently paused.");
      return;
    }
    const productId = args.slice(4);
    if (!existingUser) {
      await sendMessage(
        chatId,
        "⚠️ Please link your App account first.\n\nGo to App Settings → Connect Telegram to get started.",
      );
      return;
    }
    return handleBuyProduct(chatId, telegramUserId, existingUser.id, productId);
  }

  // Deep link from web: pay_<paymentId> (provider creates order/payment first, then redirects to bot)
  if (args.startsWith("pay_")) {
    const paymentId = args.slice(4);
    if (!existingUser) {
      await sendMessage(
        chatId,
        "⚠️ Please link your App account first.\n\nGo to App Settings → Connect Telegram to get started.",
      );
      return;
    }
    return handlePayByPaymentId(chatId, telegramUserId, existingUser.id, paymentId);
  }

  // Default welcome
  const welcomeText = existingUser
    ? `👋 Welcome back, ${existingUser.name ?? existingUser.email ?? "friend"}!\n\nUse /buy to purchase credits with Telegram Stars ⭐️`
    : `👋 Welcome to the app!\n\nTo get started:\n1️⃣ Link your account: Go to App Settings → Connect Telegram\n2️⃣ Then use /buy to purchase credits with Telegram Stars ⭐️`;

  await sendMessage(chatId, welcomeText);
}

async function handleBindAccount(
  chatId: number,
  telegramUserId: number,
  token: string,
  existingUser: { id: string; name: string | null; email: string | null } | null,
) {
  // Verify the Redis-backed binding token (one-time use)
  const targetUserId = await verifyBindingToken(token);

  if (!targetUserId) {
    await sendMessage(chatId, "❌ Invalid or expired link token. Please generate a new one from App settings.");
    return;
  }

  // Check if this Telegram ID is already bound to another account
  if (existingUser && existingUser.id !== targetUserId) {
    await sendMessage(
      chatId,
      `⚠️ Your Telegram account is already linked to another App account (${existingUser.email ?? existingUser.name ?? "unknown"}).\n\nPlease unlink it first if you want to link to a different account.`,
    );
    return;
  }

  // Bind the account
  await db.user.update({
    where: { id: targetUserId },
    data: { telegramId: String(telegramUserId) },
  });

  const user = await db.user.findUnique({
    where: { id: targetUserId },
    select: { name: true, email: true },
  });

  await sendMessage(
    chatId,
    `✅ Account linked successfully!\n\nLinked to: ${user?.name ?? user?.email ?? "your account"}\n\nYou can now use /buy to purchase credits with Telegram Stars ⭐️`,
  );

  log.info(
    { telegramUserId, userId: targetUserId },
    "Telegram account bound to app user",
  );
}

// ─── Combined Bind + Pay ──────────────────────────────────────────────────

/**
 * Handle combined bind + pay deep link: bp_<token>
 * Token embeds both userId and productId.
 * 1. Bind the Telegram account (if not already bound)
 * 2. Immediately send invoice for the product
 */
async function handleBindAndPay(
  chatId: number,
  telegramUserId: number,
  token: string,
  existingUser: { id: string; name: string | null; email: string | null } | null,
) {
  // Verify the Redis-backed bind-pay token (one-time use)
  const result = await verifyBindPayToken(token);

  if (!result) {
    await sendMessage(chatId, "❌ Invalid or expired link. Please try again from the App website.");
    return;
  }

  const { userId: targetUserId, productId } = result;

  // Check if this Telegram ID is already bound to ANOTHER account
  if (existingUser && existingUser.id !== targetUserId) {
    await sendMessage(
      chatId,
      `⚠️ Your Telegram account is already linked to another App account (${existingUser.email ?? existingUser.name ?? "unknown"}).\n\nPlease unlink it first if you want to use a different account.`,
    );
    return;
  }

  // Bind if not already bound to this user
  if (existingUser?.id !== targetUserId) {
    await db.user.update({
      where: { id: targetUserId },
      data: { telegramId: String(telegramUserId) },
    });

    const user = await db.user.findUnique({
      where: { id: targetUserId },
      select: { name: true, email: true },
    });

    await sendMessage(
      chatId,
      `✅ Account linked to ${user?.name ?? user?.email ?? "your account"}!\n\nPreparing your purchase...`,
    );

    log.info(
      { telegramUserId, userId: targetUserId },
      "Telegram account bound via bind-and-pay flow",
    );
  }

  // Now proceed to buy the product
  await handleBuyProduct(chatId, telegramUserId, targetUserId, productId);
}

// ─── Pay by existing Payment ID (from web deep link) ──────────────────────

async function handlePayByPaymentId(
  chatId: number,
  telegramUserId: number,
  userId: string,
  paymentId: string,
) {
  const payment = await db.payment.findFirst({
    where: { id: paymentId, userId, status: "PENDING" },
    include: { order: { include: { product: { include: { creditsPackage: true } } } } },
  });

  if (!payment) {
    await sendMessage(chatId, "❌ Payment not found or already processed.");
    return;
  }

  const product = payment.order?.product;
  if (!product) {
    await sendMessage(chatId, "❌ Product information not found.");
    return;
  }

  const stars = getStarsPrice(product.id, payment.amount);
  const credits = product.creditsPackage?.creditsAmount ?? 0;

  // Payload must be ≤128 bytes (Telegram limit). Just send the paymentId.
  await sendInvoice({
    chatId,
    title: product.name,
    description: `${credits} credits for the App`,
    payload: payment.id,
    prices: [{ label: product.name, amount: stars }],
  });

  log.info(
    { telegramUserId, userId, paymentId, orderId: payment.orderId, stars },
    "Sent Telegram Stars invoice for existing payment",
  );
}

// ─── Buy Credits ──────────────────────────────────────────────────────────

async function handleBuy(chatId: number, telegramUserId: number) {
  if (SALES_PAUSED) {
    await sendMessage(chatId, "Sales are currently paused.");
    return;
  }
  // Find the bound user
  const user = await db.user.findFirst({
    where: { telegramId: String(telegramUserId) },
    select: { id: true },
  });

  if (!user) {
    await sendMessage(
      chatId,
      "⚠️ Please link your App account first.\n\nGo to App Settings → Connect Telegram to get started.",
    );
    return;
  }

  // Get available credit packages
  const products = await db.product.findMany({
    where: {
      type: "CREDITS_PACKAGE",
      status: "ACTIVE",
      isAvailable: true,
      deletedAt: null,
    },
    include: { creditsPackage: true },
    orderBy: { sortOrder: "asc" },
  });

  if (products.length === 0) {
    await sendMessage(chatId, "No credit packages available at the moment. Please try again later.");
    return;
  }

  // Build inline keyboard with product options
  const keyboard: TelegramInlineKeyboardMarkup = {
    inline_keyboard: products.map((p) => {
      const stars = getStarsPrice(p.id, p.price);
      const credits = p.creditsPackage?.creditsAmount ?? 0;
      return [
        {
          text: `${p.name} — ${credits} credits — ⭐️ ${stars} Stars`,
          callback_data: `buy_${p.id}`,
        },
      ];
    }),
  };

  await sendMessage(
    chatId,
    "🛒 *Choose a credit package:*\n\nSelect a package below to pay with Telegram Stars ⭐️",
    { parse_mode: "Markdown", reply_markup: keyboard },
  );
}

async function handleBuyProduct(
  chatId: number,
  telegramUserId: number,
  userId: string,
  productId: string,
) {
  if (SALES_PAUSED) {
    await sendMessage(chatId, "Sales are currently paused.");
    return;
  }
  const product = await db.product.findFirst({
    where: {
      id: productId,
      type: "CREDITS_PACKAGE",
      status: "ACTIVE",
      isAvailable: true,
      deletedAt: null,
    },
    include: { creditsPackage: true },
  });

  if (!product) {
    await sendMessage(chatId, "❌ Product not found or unavailable.");
    return;
  }

  const stars = getStarsPrice(product.id, product.price);
  const credits = product.creditsPackage?.creditsAmount ?? 0;

  // Create order + payment first, so we have IDs for the payload
  initOrderProviders();

  const order = await createOrder({
    userId,
    productId: product.id,
    type: "NEW_PURCHASE",
    amount: product.price, // USD cents
    quantity: 1,
    currency: "usd",
  });

  const payment = await createPayment({
    orderId: order.id,
    userId,
    amount: product.price,
    currency: "usd",
    isSubscription: false,
    paymentGateway: "TELEGRAM_STARS",
    extra: {
      telegramUserId,
      starsAmount: stars,
    },
  });

  // Payload must be ≤128 bytes (Telegram limit). Just send the paymentId.
  await sendInvoice({
    chatId,
    title: product.name,
    description: `${credits} credits for the App`,
    payload: payment.id,
    prices: [{ label: product.name, amount: stars }],
  });

  log.info(
    {
      telegramUserId,
      userId,
      productId: product.id,
      orderId: order.id,
      paymentId: payment.id,
      stars,
    },
    "Sent Telegram Stars invoice",
  );
}

// ─── Pre-Checkout Query ───────────────────────────────────────────────────

async function handlePreCheckoutQuery(query: NonNullable<TelegramUpdate["pre_checkout_query"]>) {
  // Payload is now a bare paymentId string (≤128 bytes)
  try {
    const paymentId = extractPaymentId(query.invoice_payload);

    if (!paymentId) {
      await answerPreCheckoutQuery(query.id, false, "Invalid payment data");
      return;
    }

    // Check payment is still pending
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (payment?.status !== "PENDING") {
      await answerPreCheckoutQuery(query.id, false, "Payment is no longer valid");
      return;
    }

    // Check order is still pending
    const order = await db.order.findUnique({
      where: { id: payment.orderId },
    });

    if (order?.status !== "PENDING") {
      await answerPreCheckoutQuery(query.id, false, "Order is no longer valid");
      return;
    }

    // All good - approve the checkout
    await answerPreCheckoutQuery(query.id, true);

    log.info(
      { preCheckoutQueryId: query.id, paymentId },
      "Pre-checkout query approved",
    );
  } catch (err) {
    log.error({ err, preCheckoutQueryId: query.id }, "Pre-checkout query validation failed");
    await answerPreCheckoutQuery(query.id, false, "Payment validation failed");
  }
}

// ─── Successful Payment ───────────────────────────────────────────────────

async function handleSuccessfulPayment(
  message: NonNullable<TelegramUpdate["message"]>,
) {
  const sp = message.successful_payment;
  if (!sp) return;

  const telegramUserId = message.from?.id;
  const chatId = message.chat.id;

  try {
    const paymentId = extractPaymentId(sp.invoice_payload);

    if (!paymentId) {
      log.error({ payload: sp.invoice_payload }, "Successful payment: invalid payload");
      return;
    }

    log.info(
      {
        telegramUserId,
        paymentId,
        telegramPaymentChargeId: sp.telegram_payment_charge_id,
        providerPaymentChargeId: sp.provider_payment_charge_id,
        stars: sp.total_amount,
        currency: sp.currency,
      },
      "Telegram Stars payment succeeded",
    );

    // Update payment with Telegram charge IDs
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      log.error({ paymentId }, "Payment not found for successful Telegram payment");
      return;
    }

    // Idempotency: skip if already succeeded
    if (payment.status === "SUCCEEDED") {
      log.info({ paymentId: payment.id }, "Telegram payment already processed (idempotent skip)");
      await sendMessage(chatId, "✅ Your credits have already been added!");
      return;
    }

    // Update payment status
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        gatewayTransactionId: sp.telegram_payment_charge_id,
        gatewayResponse: {
          telegram_payment_charge_id: sp.telegram_payment_charge_id,
          provider_payment_charge_id: sp.provider_payment_charge_id,
          currency: sp.currency,
          total_amount: sp.total_amount,
          invoice_payload: sp.invoice_payload,
          telegramUserId,
        } as unknown as Prisma.JsonObject,
        extra: {
          ...((payment.extra ?? {}) as Record<string, unknown>),
          telegramPaymentChargeId: sp.telegram_payment_charge_id,
          providerPaymentChargeId: sp.provider_payment_charge_id,
        } as Prisma.JsonObject,
      },
    });

    // Trigger fulfillment
    try {
      const { processFulfillmentByPayment } = await import("@/server/fulfillment/manager");
      await processFulfillmentByPayment(payment);
      await db.order.update({
        where: { id: payment.orderId },
        data: { status: "FULFILLED" },
      });
      await db.user.update({
        where: { id: payment.userId },
        data: { hasPurchased: true },
      });

      // Get order details for the confirmation message
      const order = await db.order.findUnique({
        where: { id: payment.orderId },
        include: { product: { include: { creditsPackage: true } } },
      });
      const credits = order?.product?.creditsPackage?.creditsAmount ?? 0;

      await sendMessage(
        chatId,
        `✅ Payment successful!\n\n💰 ${credits} credits have been added to your account.\n\nThank you for your purchase! 🎉`,
      );

      // Update UserStats
      const now = new Date();
      await db.userStats.upsert({
        where: { userId: payment.userId },
        create: {
          userId: payment.userId,
          totalPaidCents: payment.amount,
          ordersCount: 1,
          firstPaidAt: now,
          lastPaidAt: now,
        },
        update: {
          totalPaidCents: { increment: payment.amount },
          ordersCount: { increment: 1 },
          lastPaidAt: now,
        },
      });

      log.info(
        { paymentId: payment.id, orderId: payment.orderId, credits },
        "Telegram Stars order fulfilled",
      );
    } catch (err) {
      log.error(
        { err, paymentId: payment.id, orderId: payment.orderId },
        "Fulfillment failed after Telegram Stars payment",
      );
      await sendMessage(
        chatId,
        "⚠️ Payment received but there was an issue adding your credits. Our team has been notified and will resolve this shortly.",
      );
    }
  } catch (err) {
    log.error({ err, payload: sp.invoice_payload }, "Failed to process successful payment");
    await sendMessage(
      chatId,
      "⚠️ Payment received but there was an issue processing it. Our team has been notified.",
    );
  }
}

// ─── Callback Query (inline keyboard) ─────────────────────────────────────

async function handleCallbackQuery(chatId: number, telegramUserId: number, data: string) {
  if (data.startsWith("buy_")) {
    if (SALES_PAUSED) {
      await sendMessage(chatId, "Sales are currently paused.");
      return;
    }
    const productId = data.slice(4);
    const user = await db.user.findFirst({
      where: { telegramId: String(telegramUserId) },
      select: { id: true },
    });

    if (!user) {
      await sendMessage(chatId, "⚠️ Please link your App account first.");
      return;
    }

    await handleBuyProduct(chatId, telegramUserId, user.id, productId);
  }
}

// ─── Main Update Handler ──────────────────────────────────────────────────

export async function handleTelegramUpdate(update: TelegramUpdate) {
  log.info({ updateId: update.update_id }, "Processing Telegram update");

  // Pre-checkout query (must respond within 10 seconds!)
  if (update.pre_checkout_query) {
    await handlePreCheckoutQuery(update.pre_checkout_query);
    return;
  }

  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const telegramUserId = msg.from?.id;

    if (!telegramUserId) return;

    // Successful payment notification
    if (msg.successful_payment) {
      await handleSuccessfulPayment(msg);
      return;
    }

    // Text commands
    const text = (msg.text ?? "").trim();

    if (text.startsWith("/start")) {
      const args = text.slice(6).trim();
      await handleStart(chatId, telegramUserId, args);
      return;
    }

    if (text === "/buy" || text === "/buy@" || text.startsWith("/buy ")) {
      await handleBuy(chatId, telegramUserId);
      return;
    }

    if (text === "/help") {
      await sendMessage(
        chatId,
        "🤖 *App Bot*\n\n" +
          "/buy — Purchase credits with Telegram Stars ⭐️\n" +
          "/help — Show this help message\n\n" +
          "To link your account, go to App Settings → Connect Telegram",
        { parse_mode: "Markdown" },
      );
      return;
    }

    // Unknown command: gentle redirect
    if (text.startsWith("/")) {
      await sendMessage(
        chatId,
        "I don't recognize that command. Use /help to see available commands.",
      );
      return;
    }
  }

  // Handle callback_query (from inline keyboard buttons)
  const raw = update as unknown as Record<string, unknown>;
  const callbackQuery = raw.callback_query as
    | {
        id: string;
        from: { id: number };
        message?: { chat: { id: number } };
        data?: string;
      }
    | undefined;

  if (callbackQuery?.data && callbackQuery.message?.chat.id) {
    await handleCallbackQuery(
      callbackQuery.message.chat.id,
      callbackQuery.from.id,
      callbackQuery.data,
    );

    // Answer callback query to remove loading state
    const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
    await fetch(
      `https://api.telegram.org/bot${botToken}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQuery.id }),
      },
    ).catch(() => null);
  }
}
