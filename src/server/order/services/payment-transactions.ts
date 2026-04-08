import { db } from "@/server/db";
import { logger } from "@/server/shared/telemetry/logger";
import { Prisma } from "@prisma/client";

export type PaymentTransactionKind =
  | "ONE_OFF_CHARGE"
  | "SUBSCRIPTION_INITIAL_CHARGE"
  | "SUBSCRIPTION_RENEWAL_CHARGE"
  | "SUBSCRIPTION_UPDATE_CHARGE"
  | "SUBSCRIPTION_OTHER_CHARGE"
  | "REFUND"
  | "DISPUTE";

function normalizeGateway(gateway: string): string {
  return (gateway || "").toUpperCase();
}

function normalizeCurrency(currency: string): string {
  return (currency || "usd").toLowerCase();
}

/**
 * Append-only write. If (gateway, externalId) already exists, this is a no-op.
 */
export async function recordPaymentTransaction(params: {
  userId?: string | null;
  gateway: string;
  externalId: string;
  kind: PaymentTransactionKind;
  amountCents: number;
  currency: string;
  occurredAt: Date;
  orderId?: string | null;
  paymentId?: string | null;
  gatewaySubscriptionId?: string | null;
  gatewayInvoiceId?: string | null;
  gatewayChargeId?: string | null;
  gatewayPaymentIntentId?: string | null;
  sourceEventId?: string | null;
  sourceEventType?: string | null;
}): Promise<{ created: boolean }> {
  const gateway = normalizeGateway(params.gateway);
  const externalId = params.externalId;
  const currency = normalizeCurrency(params.currency);

  // Stripe first-principles: a transaction row represents a real cashflow, keyed by charge id (ch_*).
  // This prevents future accidental double-writes from invoice(in_*) / payment_intent(pi_*) paths.
  if (gateway === "STRIPE" && !externalId.startsWith("ch_")) return { created: false };
  if (!externalId) return { created: false };

  try {
    await db.paymentTransaction.create({
      data: {
        userId: params.userId ?? null,
        gateway,
        externalId,
        kind: params.kind,
        amount: params.amountCents,
        currency,
        occurredAt: params.occurredAt,
        orderId: params.orderId ?? null,
        paymentId: params.paymentId ?? null,
        gatewaySubscriptionId: params.gatewaySubscriptionId ?? null,
        gatewayInvoiceId: params.gatewayInvoiceId ?? null,
        gatewayChargeId: params.gatewayChargeId ?? null,
        gatewayPaymentIntentId: params.gatewayPaymentIntentId ?? null,
        sourceEventId: params.sourceEventId ?? null,
        sourceEventType: params.sourceEventType ?? null,
      },
    });
    return { created: true };
  } catch (err) {
    // Duplicate (idempotent): swallow.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { created: false };
    }
    logger.error(
      { err, gateway, externalId, kind: params.kind },
      "Failed to record payment transaction"
    );
    throw err;
  }
}

export function inferOccurredAtFromStripeObject(raw: unknown): Date | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  // Invoice: prefer status_transitions.paid_at, fallback to created
  const statusTransitions = obj.status_transitions as Record<string, unknown> | null | undefined;
  const paidAt =
    statusTransitions && typeof statusTransitions.paid_at === "number"
      ? new Date(statusTransitions.paid_at * 1000)
      : null;
  if (paidAt) return paidAt;

  const created = typeof obj.created === "number" ? new Date(obj.created * 1000) : null;
  if (created) return created;

  return null;
}

export function inferOccurredAtFromIsoFields(raw: unknown): Date | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const candidates = [
    obj.paid_at,
    obj.paidAt,
    obj.created_at,
    obj.createdAt,
    obj.updated_at,
    obj.updatedAt,
  ];
  for (const v of candidates) {
    if (typeof v === "string" && v && !Number.isNaN(Date.parse(v))) {
      return new Date(v);
    }
  }
  return null;
}



