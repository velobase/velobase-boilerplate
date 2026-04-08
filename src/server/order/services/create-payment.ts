import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

interface CreatePaymentParams {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  isSubscription?: boolean;
  paymentGateway?: string;
  extra?: Record<string, unknown>;
}

export async function createPayment({
  orderId,
  userId,
  amount,
  currency,
  isSubscription = false,
  paymentGateway = "STRIPE",
  extra,
}: CreatePaymentParams) {
  const order = await db.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Payment-level idempotency:
  // If there is already a valid pending payment for this order, reuse it to avoid duplicate charges/sessions.
  const now = new Date();
  const requestedCryptoCurrency =
    typeof extra?.requestedCryptoCurrency === "string" && extra.requestedCryptoCurrency.length > 0
      ? extra.requestedCryptoCurrency
      : undefined;
  const existingPayment = await db.payment.findFirst({
    where: {
      orderId,
      userId,
      status: "PENDING",
      paymentGateway,
      deletedAt: null,
      expiresAt: { gt: now },
      ...(paymentGateway?.toUpperCase() === "NOWPAYMENTS" && requestedCryptoCurrency
        ? {
            // Do not reuse a pending crypto invoice created for a different coin/network.
            extra: { path: ["requestedCryptoCurrency"], equals: requestedCryptoCurrency } as Prisma.JsonFilter,
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingPayment) {
    return existingPayment;
  }

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  const payment = await db.payment.create({
    data: {
      orderId,
      userId,
      amount,
      currency,
      status: "PENDING",
      paymentGateway,
      isSubscription,
      expiresAt,
      extra: extra ? (extra as Prisma.InputJsonValue) : undefined,
    },
  });

  return payment;
}

