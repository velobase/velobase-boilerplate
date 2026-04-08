"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { Loader2, Mail, MessageCircle } from "lucide-react";

declare global {
  interface Window {
    AirwallexComponentsSDK?: {
      init?: (opts: AirwallexInitOptions) => Promise<AirwallexInitResult> | AirwallexInitResult;
      payments?: AirwallexPaymentsApi;
      payment?: AirwallexPaymentsApi;
    };
  }
}

type AirwallexEnv = "demo" | "prod";

type AirwallexInitOptions = {
  env?: AirwallexEnv;
  enabledElements?: string[];
  locale?: string;
};

type AirwallexRedirectToCheckoutOptions = {
  intent_id: string;
  client_secret: string;
  currency: string;
  successUrl?: string;
  country_code?: string;
};

type AirwallexPaymentsApi = {
  redirectToCheckout: (opts: AirwallexRedirectToCheckoutOptions) => Promise<void> | void;
};

type AirwallexInitResult = {
  payments?: AirwallexPaymentsApi;
  payment?: AirwallexPaymentsApi;
};

function loadAirwallexSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Not in browser"));
  if (window.AirwallexComponentsSDK) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-airwallex-sdk="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Airwallex SDK")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://static.airwallex.com/components/sdk/v1/index.js";
    script.async = true;
    script.defer = true;
    script.dataset.airwallexSdk = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Airwallex SDK"));
    document.head.appendChild(script);
  });
}

export default function AirwallexHppPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams?.get("paymentId") ?? "";

  const { data: payment } = api.order.getPayment.useQuery(
    { paymentId },
    { enabled: !!paymentId }
  );

  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const extra =
      payment?.extra && typeof payment.extra === "object" && payment.extra !== null
        ? (payment.extra as Record<string, unknown>)
        : null;

    const airwallex =
      extra && typeof extra.airwallex === "object" && extra.airwallex !== null
        ? (extra.airwallex as Record<string, unknown>)
        : null;

    const intentId = typeof airwallex?.intentId === "string" ? airwallex.intentId : "";
    const clientSecret = typeof airwallex?.clientSecret === "string" ? airwallex.clientSecret : "";
    const env: AirwallexEnv =
      airwallex?.env === "demo" || airwallex?.env === "prod" ? (airwallex.env as AirwallexEnv) : "prod";

    const successUrl = typeof extra?.SuccessURL === "string" ? extra.SuccessURL : "";
    const currency = typeof payment?.currency === "string" ? payment.currency.toUpperCase() : "USD";

    return { intentId, clientSecret, env, successUrl, currency };
  }, [payment]);

  useEffect(() => {
    if (!paymentId) return;
    if (!payment) return;
    if (error) return;

    const { intentId, clientSecret, env, successUrl, currency } = params;
    if (!intentId || !clientSecret) {
      setError("Missing payment intent information. Please try again or contact support.");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await loadAirwallexSdk();
        if (cancelled) return;

        const sdk = window.AirwallexComponentsSDK;
        if (!sdk?.init) {
          throw new Error("Airwallex SDK init not found");
        }

        const res = await sdk.init({ env, enabledElements: ["payments"], locale: "en" });
        const payments = res.payments ?? res.payment ?? sdk.payments ?? sdk.payment;
        if (!payments) {
          throw new Error("Airwallex SDK payments.redirectToCheckout not found");
        }

        await payments.redirectToCheckout({
          intent_id: intentId,
          client_secret: clientSecret,
          currency,
          ...(successUrl ? { successUrl } : {}),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(`Failed to redirect to payment page: ${msg}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [paymentId, payment, params, error]);

  // If user opens this without a paymentId, send them home
  useEffect(() => {
    if (paymentId) return;
    router.replace("/");
  }, [paymentId, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      {error ? (
        <div className="max-w-md text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-foreground">Payment Error</h2>
            <p className="text-sm text-destructive">{error}</p>
          </div>
          
          <div className="pt-4 border-t border-border space-y-3">
            <p className="text-sm text-muted-foreground">Need help? Contact our support team:</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="mailto:support@example.com"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm transition-colors"
              >
                <Mail className="h-4 w-4" />
                support@example.com
              </a>
              <a
                href="https://discord.gg/vfjrh3JTqc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-sm transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Discord
              </a>
            </div>
          </div>
          
          <button
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            ← Go back
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting to payment page…
        </div>
      )}
    </div>
  );
}


