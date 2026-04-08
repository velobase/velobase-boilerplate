/**
 * Stripe error helpers
 *
 * We avoid importing Stripe error classes to keep this resilient across bundlers/esm/cjs.
 */

export function isStripeNoSuchCustomerError(err: unknown): boolean {
  const e = err as {
    message?: unknown;
    code?: unknown;
    param?: unknown;
    type?: unknown;
    raw?: { message?: unknown; code?: unknown; param?: unknown; type?: unknown } | undefined;
  };

  const msg =
    (typeof e?.message === "string" ? e.message : undefined) ??
    (typeof e?.raw?.message === "string" ? e.raw.message : "");

  const code =
    (typeof e?.code === "string" ? e.code : undefined) ??
    (typeof e?.raw?.code === "string" ? e.raw.code : undefined);

  const param =
    (typeof e?.param === "string" ? e.param : undefined) ??
    (typeof e?.raw?.param === "string" ? e.raw.param : undefined);

  // Common Stripe patterns:
  // - "No such customer: 'cus_xxx'"
  // - "a similar object exists in live mode, but a test mode key was used..."
  if (msg.includes("No such customer")) return true;
  if (code === "resource_missing" && param === "customer") return true;

  return false;
}


