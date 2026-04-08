import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { createStripeRefund } from "./stripe/create-refund";
import type { Prisma } from "@prisma/client";
import { voidAffiliateEarningsForRefund } from "@/server/affiliate/services/ledger";

const logger = createLogger("orders:refund-payment");

interface RefundPaymentParams {
  paymentId: string;
  userId: string;
  amount?: number;
  reason?: string;
}

export async function refundPayment({
  paymentId,
  userId,
  amount,
  reason,
}: RefundPaymentParams) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: true,
    },
  });

  if (!payment) {
    throw new Error("Payment not found");
  }

  if (payment.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (payment.status !== "SUCCEEDED") {
    throw new Error("Can only refund succeeded payments");
  }

  if (!payment.gatewayTransactionId) {
    throw new Error("Payment has no gateway transaction ID");
  }

  const refund = await createStripeRefund({
    paymentIntentId: payment.gatewayTransactionId,
    amount,
    reason,
  });

  const updatedPayment = await db.payment.update({
    where: { id: paymentId },
    data: {
      status: "REFUNDED",
      extra: JSON.parse(JSON.stringify({
        ...(payment.extra as object),
        refund,
      })) as Prisma.InputJsonValue,
    },
  });

  await db.order.update({
    where: { id: payment.orderId },
    data: {
      status: "REFUNDED",
    },
  });

  // Void affiliate commissions for this payment (if any).
  try {
    const refundId = refund && typeof refund === "object" && "id" in refund ? (refund as { id: string }).id : null;
    await voidAffiliateEarningsForRefund({
      paymentId,
      idempotencyKey: `refund_void:${paymentId}:${refundId ?? "unknown"}`,
    });
  } catch (error) {
    logger.error({ error, paymentId }, "Failed to void affiliate earnings on refund (ignored)");
  }

  return updatedPayment;
}

