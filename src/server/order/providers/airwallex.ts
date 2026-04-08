import crypto from "crypto";
import { BaseWebhookResult, type PaymentProvider, type ProviderOrder, type ProviderPayment } from "./types";
import {
  getAirwallexApiKey,
  getAirwallexBaseUrl,
  getAirwallexClientId,
  getAirwallexEnv,
  getAirwallexWebhookSecret,
  getAirwallexAccountId,
} from "@/server/shared/env";

type AirwallexEnv = "demo" | "prod";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

function toAirwallexAmount(amountCents: number, currency: string): number {
  const c = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return amountCents;
  return Number((amountCents / 100).toFixed(2));
}

function toMinorUnits(amount: number, currency: string): number {
  const c = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return Math.round(amount);
  return Math.round(amount * 100);
}

export function resolveAirwallexBaseUrl(): string {
  const override = getAirwallexBaseUrl();
  if (override) return override;
  const env = getAirwallexEnv() as AirwallexEnv;
  return env === "demo" ? "https://api-demo.airwallex.com" : "https://api.airwallex.com";
}

export type TokenLevel = "org" | "account";

// Cache tokens separately for org-level and account-level
const cachedTokens: Record<TokenLevel, { token: string; expiresAtMs: number } | null> = {
  org: null,
  account: null,
};

/**
 * Get access token for Airwallex API.
 * @param level - "org" for organization-level APIs (Billing), "account" for account-level APIs (Payment Acceptance)
 */
export async function getAccessToken(level: TokenLevel = "account"): Promise<string> {
  const now = Date.now();
  const cached = cachedTokens[level];
  if (cached && cached.expiresAtMs - now > 60_000) {
    return cached.token;
  }

  const clientId = getAirwallexClientId();
  const apiKey = getAirwallexApiKey();
  if (!clientId || !apiKey) {
    throw new Error("Airwallex is not configured: missing AIRWALLEX_CLIENT_ID or AIRWALLEX_API_KEY");
  }

  const baseUrl = resolveAirwallexBaseUrl();
  const headers: Record<string, string> = {
    "x-client-id": clientId,
    "x-api-key": apiKey,
    "content-type": "application/json",
  };

  // For account-level token, add x-login-as header
  if (level === "account") {
    headers["x-login-as"] = getAirwallexAccountId();
  }

  const resp = await fetch(`${baseUrl}/api/v1/authentication/login`, {
    method: "POST",
    headers,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Airwallex auth failed (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as { token?: string; expires_at?: string };
  const token = typeof data.token === "string" ? data.token : "";
  const expiresAtMs = typeof data.expires_at === "string" ? Date.parse(data.expires_at) : 0;
  if (!token || !Number.isFinite(expiresAtMs) || expiresAtMs <= 0) {
    throw new Error("Airwallex auth response missing token/expires_at");
  }

  cachedTokens[level] = { token, expiresAtMs };
  return token;
}

function hmacSha256Hex(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  try {
    const a = Buffer.from(aHex, "hex");
    const b = Buffer.from(bHex, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function getSiteOriginFromExtra(extra: ProviderPayment["extra"]): string | undefined {
  const success = typeof extra?.SuccessURL === "string" ? extra.SuccessURL : "";
  const cancel = typeof extra?.CancelURL === "string" ? extra.CancelURL : "";
  const candidate = success || cancel;
  if (!candidate) return undefined;
  try {
    return new URL(candidate).origin;
  } catch {
    return undefined;
  }
}

export const airwallexProvider: PaymentProvider = {
  async createPayment({ payment, order }: { payment: ProviderPayment; order: ProviderOrder }) {
    const token = await getAccessToken("account"); // Payment Acceptance API requires account-level token
    const baseUrl = resolveAirwallexBaseUrl();
    const currency = (order.currency || "USD").toUpperCase();
    const amount = toAirwallexAmount(order.amount, currency);

    const requestBody = {
      request_id: payment.id,
      amount,
      currency,
      merchant_order_id: order.id,
      return_url: typeof payment.extra?.SuccessURL === "string" ? payment.extra.SuccessURL : undefined,
      metadata: {
        paymentId: payment.id,
        orderId: order.id,
      },
    };

    const resp = await fetch(`${baseUrl}/api/v1/pa/payment_intents/create`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Airwallex create payment intent failed (${resp.status}): ${text}`);
    }

    const intent = (await resp.json()) as { id?: string; client_secret?: string; status?: string };
    const intentId = typeof intent.id === "string" ? intent.id : "";
    const clientSecret = typeof intent.client_secret === "string" ? intent.client_secret : "";
    if (!intentId || !clientSecret) {
      throw new Error("Airwallex create payment intent response missing id/client_secret");
    }

    // Persist provider-specific info into payment.extra (checkout() will write it back)
    const env = getAirwallexEnv();
    (payment.extra ??= {});
    const prev =
      typeof (payment.extra as Record<string, unknown>).airwallex === "object" &&
      (payment.extra as Record<string, unknown>).airwallex !== null
        ? ((payment.extra as Record<string, unknown>).airwallex as Record<string, unknown>)
        : {};
    (payment.extra as Record<string, unknown>).airwallex = {
      ...prev,
      env,
      intentId,
      clientSecret,
      baseUrl,
    };

    const origin = getSiteOriginFromExtra(payment.extra);
    const redirectPath = `/payment/airwallex/hpp?paymentId=${encodeURIComponent(payment.id)}`;

    return {
      paymentUrl: origin ? `${origin}${redirectPath}` : redirectPath,
      gatewayTransactionId: intentId,
    };
  },

  async createSubscription({ payment, order }: { payment: ProviderPayment; order: ProviderOrder }) {
    const token = await getAccessToken("org"); // Billing API requires org-level token
    const baseUrl = resolveAirwallexBaseUrl();
    const currency = (order.currency || "USD").toUpperCase();

    const extra = (payment.extra ?? {}) as Record<string, unknown>;
    const aw =
      typeof extra.airwallex === "object" && extra.airwallex !== null
        ? (extra.airwallex as Record<string, unknown>)
        : {};
    const subscriptionPriceId = typeof aw.subscriptionPriceId === "string" ? aw.subscriptionPriceId : "";
    const trialDays = typeof aw.trialDays === "number" && aw.trialDays > 0 ? aw.trialDays : 0;
    const customerEmail = typeof aw.customerEmail === "string" && aw.customerEmail.length > 0 ? aw.customerEmail : undefined;
    const customerName = typeof aw.customerName === "string" && aw.customerName.length > 0 ? aw.customerName : undefined;

    if (!subscriptionPriceId) {
      throw new Error("Airwallex subscription missing airwallex.subscriptionPriceId in payment.extra");
    }

    const successUrl = typeof payment.extra?.SuccessURL === "string" ? payment.extra.SuccessURL : undefined;
    const backUrl = typeof payment.extra?.CancelURL === "string" ? payment.extra.CancelURL : undefined;

    const trialEndsAt =
      trialDays > 0
        ? (() => {
            const d = new Date();
            d.setDate(d.getDate() + trialDays);
            return d.toISOString();
          })()
        : undefined;

    const requestBody: Record<string, unknown> = {
      request_id: payment.id,
      mode: "SUBSCRIPTION",
      currency,
      success_url: successUrl,
      ...(backUrl ? { back_url: backUrl } : {}),
      line_items: [{ price_id: subscriptionPriceId, quantity: 1 }],
      metadata: {
        paymentId: payment.id,
        orderId: order.id,
      },
      // Prefill customer data from our user record (non-editable in checkout)
      ...(customerEmail || customerName
        ? {
            customer_data: {
              ...(customerEmail ? { email: customerEmail } : {}),
              ...(customerName ? { name: customerName } : {}),
              type: "INDIVIDUAL",
            },
          }
        : {}),
      // subscription_data is required for SUBSCRIPTION mode
      subscription_data: {
        ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
        metadata: {
          paymentId: payment.id,
          orderId: order.id,
        },
      },
      locale: "EN",
    };

    const resp = await fetch(`${baseUrl}/api/v1/billing_checkouts/create`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Airwallex create billing checkout failed (${resp.status}): ${text}`);
    }

    const checkout = (await resp.json()) as {
      id?: string;
      url?: string;
      status?: string;
      subscription_id?: string;
    };
    const billingCheckoutId = typeof checkout.id === "string" ? checkout.id : "";
    const checkoutUrl = typeof checkout.url === "string" ? checkout.url : "";
    const subscriptionId = typeof checkout.subscription_id === "string" ? checkout.subscription_id : undefined;
    if (!billingCheckoutId || !checkoutUrl) {
      throw new Error("Airwallex billing checkout response missing id/url");
    }

    // Persist provider-specific info into payment.extra (checkout() will write it back)
    const env = getAirwallexEnv();
    (payment.extra ??= {});
    const prev =
      typeof (payment.extra as Record<string, unknown>).airwallex === "object" &&
      (payment.extra as Record<string, unknown>).airwallex !== null
        ? ((payment.extra as Record<string, unknown>).airwallex as Record<string, unknown>)
        : {};
    (payment.extra as Record<string, unknown>).airwallex = {
      ...prev,
      env,
      baseUrl,
      billingCheckoutId,
      subscriptionPriceId,
      ...(trialEndsAt ? { trialEndsAt } : {}),
    };

    return {
      paymentUrl: checkoutUrl,
      gatewayTransactionId: billingCheckoutId,
      ...(subscriptionId ? { gatewaySubscriptionId: subscriptionId } : {}),
    };
  },

  async handlePaymentWebhook(req: Request) {
    const signature = req.headers.get("x-signature");
    const timestamp = req.headers.get("x-timestamp") ?? "";
    const secret = getAirwallexWebhookSecret();
    if (!signature || !secret) return null;

    const body = await req.text();
    // Airwallex signature = HMAC-SHA256(secret, timestamp + body)
    const expected = hmacSha256Hex(secret, timestamp + body);
    if (!timingSafeEqualHex(signature, expected)) {
      throw new Error("Invalid Airwallex webhook signature");
    }

    const event = JSON.parse(body) as {
      id?: string;
      name?: string;
      type?: string;
      sourceId?: string;
      data?: unknown;
    };

    const eventName = (event.name ?? event.type ?? "").toString();
    const data = event.data;
    const obj = (() => {
      if (!data || typeof data !== "object") return {} as Record<string, unknown>;
      const d = data as Record<string, unknown>;
      if (typeof d.object === "object" && d.object !== null) return d.object as Record<string, unknown>;
      return d;
    })();

    const objectId =
      typeof obj.id === "string" ? obj.id : typeof event.sourceId === "string" ? event.sourceId : undefined;

    if (!eventName) return null;

    const status = (() => {
      const n = eventName.toLowerCase();
      // Billing Checkout (subscription purchase)
      if (n === "billing_checkout.completed") return "SUCCEEDED" as const;
      if (n === "billing_checkout.cancelled" || n === "billing_checkout.expired") return "EXPIRED" as const;

      // Payment Acceptance (one-off payment intent)
      if (n === "payment_intent.succeeded") return "SUCCEEDED" as const;
      if (n === "payment_intent.cancelled") return "EXPIRED" as const;
      if (n === "payment_intent.pending") return "PENDING" as const;
      if (n === "payment_intent.requires_payment_method") return "REQUIRES_ACTION" as const;
      if (n === "payment_intent.requires_customer_action") return "REQUIRES_ACTION" as const;
      if (n === "payment_attempt.authorization_failed") return "FAILED" as const;
      if (n === "payment_attempt.capture_failed") return "FAILED" as const;
      return null;
    })();

    if (!status) return null;

    const gatewaySubscriptionId =
      typeof obj.subscription_id === "string" && obj.subscription_id.length > 0 ? obj.subscription_id : undefined;

    return new BaseWebhookResult({
      status,
      gatewayTransactionId: objectId,
      gatewaySubscriptionId,
      rawData: obj,
    });
  },

  async handleSubscriptionWebhook(req: Request) {
    const signature = req.headers.get("x-signature");
    const timestamp = req.headers.get("x-timestamp") ?? "";
    const secret = getAirwallexWebhookSecret();
    if (!signature || !secret) return null;

    const body = await req.text();
    // Airwallex signature = HMAC-SHA256(secret, timestamp + body)
    const expected = hmacSha256Hex(secret, timestamp + body);
    if (!timingSafeEqualHex(signature, expected)) {
      throw new Error("Invalid Airwallex webhook signature");
    }

    const event = JSON.parse(body) as {
      id?: string;
      name?: string;
      type?: string;
      sourceId?: string;
      data?: unknown;
    };
    const eventName = (event.name ?? event.type ?? "").toString();
    const data = event.data;
    const obj = (() => {
      if (!data || typeof data !== "object") return {} as Record<string, unknown>;
      const d = data as Record<string, unknown>;
      if (typeof d.object === "object" && d.object !== null) return d.object as Record<string, unknown>;
      return d;
    })();

    if (!eventName) return null;

    const n = eventName.toLowerCase();

    // Renewal signal: invoice.payment.paid (Billing)
    if (n === "invoice.payment.paid") {
      const invoiceId =
        typeof obj.id === "string" ? obj.id : typeof event.sourceId === "string" ? event.sourceId : undefined;
      const subId = typeof obj.subscription_id === "string" ? obj.subscription_id : undefined;
      const currency = typeof obj.currency === "string" ? obj.currency : undefined;
      const totalAmount = typeof obj.total_amount === "number" ? obj.total_amount : undefined;
      const amountCents =
        totalAmount != null && currency ? toMinorUnits(totalAmount, currency) : undefined;

      return new BaseWebhookResult({
        status: "SUCCEEDED",
        gatewayTransactionId: invoiceId,
        gatewaySubscriptionId: subId,
        amount: amountCents,
        currency: currency ?? undefined,
        rawData: { ...obj, __airwallexEvent: eventName },
        isSubscription: true,
      });
    }

    // Subscription lifecycle (Billing)
    if (n.startsWith("subscription.")) {
      const subId =
        typeof obj.id === "string" ? obj.id : typeof event.sourceId === "string" ? event.sourceId : undefined;

      const normalizedStatus =
        n === "subscription.active" || n === "subscription.in_trial"
          ? ("SUCCEEDED" as const)
          : n === "subscription.unpaid"
            ? ("FAILED" as const)
            : n === "subscription.cancelled"
              ? ("EXPIRED" as const)
              : null;

      if (!normalizedStatus) return null;

      const cancelAtPeriodEnd =
        typeof obj.cancel_at_period_end === "boolean" ? obj.cancel_at_period_end : undefined;

      const cancelAt =
        typeof obj.cancel_at === "string" && !Number.isNaN(Date.parse(obj.cancel_at))
          ? new Date(obj.cancel_at)
          : null;
      const canceledAt =
        typeof obj.cancel_requested_at === "string" && !Number.isNaN(Date.parse(obj.cancel_requested_at))
          ? new Date(obj.cancel_requested_at)
          : null;

      return new BaseWebhookResult({
        status: normalizedStatus,
        gatewaySubscriptionId: subId,
        rawData: { ...obj, __airwallexEvent: eventName },
        isSubscription: true,
        normalizedData: {
          ...(typeof cancelAtPeriodEnd === "boolean" ? { cancelAtPeriodEnd } : {}),
          cancelAt,
          canceledAt,
          endedAt: null,
        },
      });
    }

    return null;
  },

  async queryPaymentStatus(gatewayTransactionId: string) {
    const token = await getAccessToken("account"); // Payment Acceptance API requires account-level token
    const baseUrl = resolveAirwallexBaseUrl();
    const resp = await fetch(`${baseUrl}/api/v1/pa/payment_intents/${encodeURIComponent(gatewayTransactionId)}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
    });
    if (!resp.ok) return "PENDING";
    const data = (await resp.json()) as { status?: string };
    const st = (data.status ?? "").toString().toUpperCase();
    if (st === "SUCCEEDED") return "SUCCEEDED";
    if (st === "CANCELLED") return "EXPIRED";
    if (st === "REQUIRES_PAYMENT_METHOD" || st === "REQUIRES_CUSTOMER_ACTION") return "REQUIRES_ACTION";
    if (st === "PENDING") return "PENDING";
    // Be conservative: treat unknowns as pending to avoid wrong fulfillment
    return "PENDING";
  },

  async confirmPayment(params: { checkoutSessionId?: string; gatewayTransactionId?: string }) {
    const id = params.gatewayTransactionId;
    if (!id) return { isPaid: false };

    // Heuristic:
    // - PaymentIntent IDs are typically "int_..."
    // - Billing Checkout IDs are typically UUID-like
    if (id.startsWith("int_")) {
      const status = await this.queryPaymentStatus?.(id);
      return { isPaid: status === "SUCCEEDED", gatewayTransactionId: id };
    }

    // Billing Checkout confirm (subscription purchase)
    const token = await getAccessToken("org"); // Billing API requires org-level token
    const baseUrl = resolveAirwallexBaseUrl();
    const resp = await fetch(`${baseUrl}/api/v1/billing_checkouts/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
    });
    if (!resp.ok) return { isPaid: false, gatewayTransactionId: id };
    const data = (await resp.json()) as { status?: string; subscription_id?: string };
    const st = (data.status ?? "").toString().toUpperCase();
    const isPaid = st === "COMPLETED";
    const subId = typeof data.subscription_id === "string" ? data.subscription_id : undefined;
    return { isPaid, gatewayTransactionId: id, gatewaySubscriptionId: subId };
  },
};

// ============================================================================
// Subscription Management APIs (not part of PaymentProvider interface)
// ============================================================================

/**
 * Cancel an Airwallex Billing subscription.
 * @param gatewaySubscriptionId - The Airwallex subscription ID (sub_xxx)
 * @param options.immediately - If true, cancel immediately with proration; otherwise cancel at period end
 */
export async function cancelAirwallexSubscription(
  gatewaySubscriptionId: string,
  options?: { immediately?: boolean; prorationBehavior?: "ALL" | "PRORATED" | "NONE" }
): Promise<{ success: boolean; error?: string }> {
  const token = await getAccessToken("org"); // Billing API requires org-level token
  const baseUrl = resolveAirwallexBaseUrl();

  if (options?.immediately) {
    // Immediate cancel with proration
    const resp = await fetch(`${baseUrl}/api/v1/subscriptions/${encodeURIComponent(gatewaySubscriptionId)}/cancel`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        request_id: `cancel_${gatewaySubscriptionId}_${Date.now()}`,
        proration_behavior: options.prorationBehavior ?? "NONE",
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { success: false, error: `Airwallex cancel subscription failed (${resp.status}): ${text}` };
    }
    return { success: true };
  } else {
    // Cancel at period end
    const resp = await fetch(`${baseUrl}/api/v1/subscriptions/${encodeURIComponent(gatewaySubscriptionId)}/update`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        request_id: `cancel_at_end_${gatewaySubscriptionId}_${Date.now()}`,
        cancel_at_period_end: true,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { success: false, error: `Airwallex update subscription failed (${resp.status}): ${text}` };
    }
    return { success: true };
  }
}

/**
 * Get Airwallex Billing subscription details.
 */
export async function getAirwallexSubscription(gatewaySubscriptionId: string): Promise<{
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEndsAt?: Date;
  endsAt?: Date;
} | null> {
  const token = await getAccessToken("org");
  const baseUrl = resolveAirwallexBaseUrl();

  const resp = await fetch(`${baseUrl}/api/v1/subscriptions/${encodeURIComponent(gatewaySubscriptionId)}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });

  if (!resp.ok) return null;

  const data = (await resp.json()) as {
    id?: string;
    status?: string;
    cancel_at_period_end?: boolean;
    current_period_ends_at?: string;
    ends_at?: string;
  };

  return {
    id: typeof data.id === "string" ? data.id : "",
    status: typeof data.status === "string" ? data.status : "UNKNOWN",
    cancelAtPeriodEnd: data.cancel_at_period_end === true,
    currentPeriodEndsAt: data.current_period_ends_at ? new Date(data.current_period_ends_at) : undefined,
    endsAt: data.ends_at ? new Date(data.ends_at) : undefined,
  };
}

/**
 * Get Airwallex Billing subscription details (extended fields for portal usage).
 */
export async function getAirwallexSubscriptionForPortal(gatewaySubscriptionId: string): Promise<{
  id: string;
  status: "PENDING" | "IN_TRIAL" | "ACTIVE" | "UNPAID" | "CANCELLED" | "UNKNOWN";
  cancelAtPeriodEnd: boolean;
  cancelRequestedAt?: Date;
  currentPeriodStartsAt?: Date;
  currentPeriodEndsAt?: Date;
  nextBillingAt?: Date;
  endsAt?: Date;
  billingCustomerId?: string;
  currency?: string;
  collectionMethod?: string;
  paymentSourceId?: string;
  latestInvoiceId?: string;
} | null> {
  const token = await getAccessToken("org");
  const baseUrl = resolveAirwallexBaseUrl();

  const resp = await fetch(`${baseUrl}/api/v1/subscriptions/${encodeURIComponent(gatewaySubscriptionId)}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });

  if (!resp.ok) return null;

  const data = (await resp.json()) as {
    id?: string;
    status?: string;
    cancel_at_period_end?: boolean;
    cancel_requested_at?: string;
    current_period_starts_at?: string;
    current_period_ends_at?: string;
    next_billing_at?: string;
    ends_at?: string;
    billing_customer_id?: string;
    currency?: string;
    collection_method?: string;
    payment_source_id?: string;
    latest_invoice_id?: string;
  };

  const statusRaw = typeof data.status === "string" ? data.status.toUpperCase() : "UNKNOWN";
  const status =
    statusRaw === "PENDING" ||
    statusRaw === "IN_TRIAL" ||
    statusRaw === "ACTIVE" ||
    statusRaw === "UNPAID" ||
    statusRaw === "CANCELLED"
      ? statusRaw
      : "UNKNOWN";

  return {
    id: typeof data.id === "string" ? data.id : "",
    status,
    cancelAtPeriodEnd: data.cancel_at_period_end === true,
    cancelRequestedAt: data.cancel_requested_at ? new Date(data.cancel_requested_at) : undefined,
    currentPeriodStartsAt: data.current_period_starts_at ? new Date(data.current_period_starts_at) : undefined,
    currentPeriodEndsAt: data.current_period_ends_at ? new Date(data.current_period_ends_at) : undefined,
    nextBillingAt: data.next_billing_at ? new Date(data.next_billing_at) : undefined,
    endsAt: data.ends_at ? new Date(data.ends_at) : undefined,
    billingCustomerId: typeof data.billing_customer_id === "string" ? data.billing_customer_id : undefined,
    currency: typeof data.currency === "string" ? data.currency : undefined,
    collectionMethod: typeof data.collection_method === "string" ? data.collection_method : undefined,
    paymentSourceId: typeof data.payment_source_id === "string" ? data.payment_source_id : undefined,
    latestInvoiceId: typeof data.latest_invoice_id === "string" ? data.latest_invoice_id : undefined,
  };
}

export async function setAirwallexCancelAtPeriodEnd(
  gatewaySubscriptionId: string,
  enable: boolean
): Promise<{ success: boolean; error?: string }> {
  const token = await getAccessToken("org");
  const baseUrl = resolveAirwallexBaseUrl();
  const resp = await fetch(`${baseUrl}/api/v1/subscriptions/${encodeURIComponent(gatewaySubscriptionId)}/update`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      request_id: `cancel_at_period_end_${enable ? "on" : "off"}_${gatewaySubscriptionId}_${Date.now()}`,
      cancel_at_period_end: enable,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return { success: false, error: `Airwallex update subscription failed (${resp.status}): ${text}` };
  }
  return { success: true };
}

export async function updateAirwallexSubscriptionPaymentSource(
  gatewaySubscriptionId: string,
  paymentSourceId: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getAccessToken("org");
  const baseUrl = resolveAirwallexBaseUrl();
  const resp = await fetch(`${baseUrl}/api/v1/subscriptions/${encodeURIComponent(gatewaySubscriptionId)}/update`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      request_id: `update_payment_source_${gatewaySubscriptionId}_${Date.now()}`,
      payment_source_id: paymentSourceId,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    return { success: false, error: `Airwallex update payment source failed (${resp.status}): ${text}` };
  }
  return { success: true };
}

export async function createAirwallexBillingCheckoutSetup(params: {
  billingCustomerId: string;
  currency: string;
  successUrl: string;
  backUrl?: string;
  locale?: "AUTO" | "EN" | "ZH";
  metadata?: Record<string, unknown>;
  requestId?: string;
}): Promise<{ id: string; url: string } | null> {
  const token = await getAccessToken("org"); // Billing API requires org-level token
  const baseUrl = resolveAirwallexBaseUrl();
  const requestBody: Record<string, unknown> = {
    request_id: params.requestId ?? `setup_${params.billingCustomerId}_${Date.now()}`,
    mode: "SETUP",
    billing_customer_id: params.billingCustomerId,
    currency: params.currency,
    success_url: params.successUrl,
    ...(params.backUrl ? { back_url: params.backUrl } : {}),
    ...(params.locale ? { locale: params.locale } : {}),
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };

  const resp = await fetch(`${baseUrl}/api/v1/billing_checkouts/create`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!resp.ok) return null;
  const checkout = (await resp.json()) as { id?: string; url?: string };
  const id = typeof checkout.id === "string" ? checkout.id : "";
  const url = typeof checkout.url === "string" ? checkout.url : "";
  if (!id || !url) return null;
  return { id, url };
}

export async function getAirwallexBillingCheckout(id: string): Promise<{
  id: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "UNKNOWN";
  mode?: string;
  subscriptionId?: string;
  paymentSourceId?: string;
} | null> {
  const token = await getAccessToken("org"); // Billing API requires org-level token
  const baseUrl = resolveAirwallexBaseUrl();
  const resp = await fetch(`${baseUrl}/api/v1/billing_checkouts/${encodeURIComponent(id)}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });
  if (!resp.ok) return null;
  const data = (await resp.json()) as {
    id?: string;
    status?: string;
    mode?: string;
    subscription_id?: string;
    payment_source_id?: string;
  };

  const st = typeof data.status === "string" ? data.status.toUpperCase() : "UNKNOWN";
  const status =
    st === "ACTIVE" || st === "COMPLETED" || st === "CANCELLED" || st === "EXPIRED"
      ? st
      : "UNKNOWN";

  return {
    id: typeof data.id === "string" ? data.id : id,
    status,
    mode: typeof data.mode === "string" ? data.mode : undefined,
    subscriptionId: typeof data.subscription_id === "string" ? data.subscription_id : undefined,
    paymentSourceId: typeof data.payment_source_id === "string" ? data.payment_source_id : undefined,
  };
}

export async function listAirwallexInvoicesBySubscription(params: {
  gatewaySubscriptionId: string;
  pageSize?: number;
}): Promise<
  Array<{
    id: string;
    number?: string;
    createdAt?: Date;
    currency?: string;
    totalAmount?: number;
    status?: string;
    paymentStatus?: string;
    hostedUrl?: string;
    pdfUrl?: string | null;
    dueAt?: Date;
    paidAt?: Date;
  }>
> {
  const token = await getAccessToken("org");
  const baseUrl = resolveAirwallexBaseUrl();

  const qs = new URLSearchParams({
    subscription_id: params.gatewaySubscriptionId,
    page_size: String(params.pageSize ?? 20),
  });

  const resp = await fetch(`${baseUrl}/api/v1/invoices?${qs.toString()}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });
  if (!resp.ok) return [];
  const data = (await resp.json()) as { items?: unknown[] };
  const items = Array.isArray(data.items) ? data.items : [];
  return items
    .map((it) => {
      const obj = it as Record<string, unknown>;
      const id = typeof obj.id === "string" ? obj.id : "";
      if (!id) return null;
      return {
        id,
        number: typeof obj.number === "string" ? obj.number : undefined,
        createdAt: typeof obj.created_at === "string" ? new Date(obj.created_at) : undefined,
        currency: typeof obj.currency === "string" ? obj.currency : undefined,
        totalAmount: typeof obj.total_amount === "number" ? obj.total_amount : undefined,
        status: typeof obj.status === "string" ? obj.status : undefined,
        paymentStatus: typeof obj.payment_status === "string" ? obj.payment_status : undefined,
        hostedUrl: typeof obj.hosted_url === "string" ? obj.hosted_url : undefined,
        pdfUrl: typeof obj.pdf_url === "string" ? obj.pdf_url : obj.pdf_url === null ? null : undefined,
        dueAt: typeof obj.due_at === "string" ? new Date(obj.due_at) : undefined,
        paidAt: typeof obj.paid_at === "string" ? new Date(obj.paid_at) : undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}


