/**
 * Payment gateway resolution logic.
 *
 * Currently forced to NOWPAYMENTS (crypto-only).
 * Credit card gateways (Stripe/Airwallex) are disabled.
 *
 * Previous priority order (for reference):
 * 1. Explicit gateway input (always wins)
 * 2. FORCE_PAYMENT_GATEWAY env var (for testing, bypasses geo-routing)
 * 3. User preference (e.g., NOWPAYMENTS)
 * 4. Default: Stripe (Airwallex disabled 2026-01-15)
 */

import type { PaymentGateway } from "../providers/types";

export interface ResolveGatewayParams {
  userId: string;
  productId: string;
  gatewayInput?: PaymentGateway;
  requestHeaders?: Headers;
  clientIp?: string;
}

export async function resolvePaymentGateway(_params: ResolveGatewayParams): Promise<PaymentGateway> {
  // All payments are routed to crypto (NOWPAYMENTS) — card gateways disabled.
  return "NOWPAYMENTS";
}

