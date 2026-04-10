/**
 * Payment gateway resolution logic.
 *
 * Priority order:
 * 1. Explicit gateway input from checkout call (always wins)
 * 2. FORCE_PAYMENT_GATEWAY env var (for testing)
 * 3. Default: STRIPE
 */

import type { PaymentGateway } from "../providers/types";
import { env } from "@/server/shared/env";

export interface ResolveGatewayParams {
  userId: string;
  productId: string;
  gatewayInput?: PaymentGateway;
  requestHeaders?: Headers;
  clientIp?: string;
}

export async function resolvePaymentGateway(params: ResolveGatewayParams): Promise<PaymentGateway> {
  if (params.gatewayInput) return params.gatewayInput;

  const forced = env.FORCE_PAYMENT_GATEWAY as PaymentGateway | undefined;
  if (forced) return forced;

  return "STRIPE";
}

