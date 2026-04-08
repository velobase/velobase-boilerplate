import { services } from "google-ads-api";
import { env } from "@/env";
import { db } from "@/server/db";
import { logger } from "@/server/shared/telemetry/logger";
import { getGoogleAdsCustomer } from "./client";
import { alertGoogleAdsOfflinePurchaseFailure } from "./alert";

type UploadResult =
  | { status: "disabled"; reason: string }
  | { status: "skipped"; reason: string; orderId?: string }
  | { status: "uploaded"; orderId: string }
  | { status: "failed"; reason: string; orderId?: string };

function formatGoogleAdsConversionDateTime(d: Date) {
  // "yyyy-mm-dd hh:mm:ss+00:00"
  return d.toISOString().replace("T", " ").substring(0, 19) + "+00:00";
}

function safeObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function getNestedObject(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = obj[key];
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function setGoogleAdsExtra(
  extra: unknown,
  patch: { uploadedAt?: string; lastAttemptAt: string; lastError?: string | null; alertedAt?: string }
) {
  const base = safeObject(extra);
  const googleAds = getNestedObject(base, "googleAds");
  const offlinePurchase = getNestedObject(googleAds, "offlinePurchase");

  return {
    ...base,
    googleAds: {
      ...googleAds,
      offlinePurchase: {
        ...offlinePurchase,
        ...patch,
      },
    },
  };
}

function getOfflinePurchaseState(extra: unknown): {
  uploadedAt?: string;
  lastAttemptAt?: string;
  lastError?: string | null;
  alertedAt?: string;
} {
  const base = safeObject(extra);
  const googleAds = getNestedObject(base, "googleAds");
  const offlinePurchase = getNestedObject(googleAds, "offlinePurchase");
  return {
    uploadedAt: typeof offlinePurchase.uploadedAt === "string" ? offlinePurchase.uploadedAt : undefined,
    lastAttemptAt: typeof offlinePurchase.lastAttemptAt === "string" ? offlinePurchase.lastAttemptAt : undefined,
    lastError: typeof offlinePurchase.lastError === "string" ? offlinePurchase.lastError : null,
    alertedAt: typeof offlinePurchase.alertedAt === "string" ? offlinePurchase.alertedAt : undefined,
  };
}

export async function uploadGoogleAdsOfflinePurchaseForPayment(paymentId: string): Promise<UploadResult> {
  if (!env.GOOGLE_ADS_CONVERSION_ACTION_ID) {
    return { status: "disabled", reason: "missing GOOGLE_ADS_CONVERSION_ACTION_ID" };
  }
  if (!env.GOOGLE_ADS_CUSTOMER_ID) {
    return { status: "disabled", reason: "missing GOOGLE_ADS_CUSTOMER_ID" };
  }

  const customer = getGoogleAdsCustomer();
  if (!customer) {
    return { status: "disabled", reason: "missing Google Ads credentials" };
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      orderId: true,
      status: true,
      amount: true,
      currency: true,
      paymentGateway: true,
      createdAt: true,
      updatedAt: true,
      extra: true,
      user: {
        select: {
          id: true,
          email: true,
          adClickId: true,
          adClickProvider: true,
        },
      },
    },
  });

  if (!payment) return { status: "skipped", reason: "payment not found" };
  if (payment.status !== "SUCCEEDED") return { status: "skipped", reason: `payment not succeeded (${payment.status})` };

  const { uploadedAt, alertedAt } = getOfflinePurchaseState(payment.extra);
  if (uploadedAt) {
    return { status: "skipped", reason: `already uploaded at ${uploadedAt}` };
  }

  const provider = (payment.user?.adClickProvider ?? "").toLowerCase();
  const clickId = payment.user?.adClickId ?? null;

  const gclid = provider === "gclid" ? clickId : null;
  const wbraid = provider === "wbraid" ? clickId : null;
  const gbraid = provider === "gbraid" ? clickId : null;

  if (!gclid && !wbraid && !gbraid) {
    // 目前只做 click-based offline conversions，email-only 的 enhanced conversions API 不在这次范围
    await db.payment.update({
      where: { id: payment.id },
      data: {
        extra: setGoogleAdsExtra(payment.extra, {
          lastAttemptAt: new Date().toISOString(),
          lastError: "missing gclid/wbraid/gbraid",
        }),
      },
    });
    return { status: "skipped", reason: "missing gclid/wbraid/gbraid", orderId: payment.orderId };
  }

  const conversionActionResourceName = `customers/${env.GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${env.GOOGLE_ADS_CONVERSION_ACTION_ID}`;
  const orderId = payment.orderId; // Google 用 order_id 做幂等去重
  const amount = payment.amount / 100;
  const currency = (payment.currency ?? "usd").toUpperCase();
  const conversionTime = payment.updatedAt ?? payment.createdAt ?? new Date();

  const clickConversion: services.IClickConversion = {
    conversion_action: conversionActionResourceName,
    conversion_date_time: formatGoogleAdsConversionDateTime(conversionTime),
    conversion_value: amount,
    currency_code: currency,
    order_id: orderId,
  };

  if (gclid) clickConversion.gclid = gclid;
  else if (wbraid) clickConversion.wbraid = wbraid;
  else if (gbraid) clickConversion.gbraid = gbraid;

  try {
    const request = services.UploadClickConversionsRequest.create({
      customer_id: env.GOOGLE_ADS_CUSTOMER_ID,
      conversions: [clickConversion],
      partial_failure: true,
      validate_only: false,
    });

    const result = await customer.conversionUploads.uploadClickConversions(request);

    if (result.partial_failure_error) {
      const msg =
        (result.partial_failure_error as unknown as { message?: string }).message ??
        JSON.stringify(result.partial_failure_error);

      const shouldAlert = !alertedAt;
      const nextExtra = setGoogleAdsExtra(payment.extra, {
        lastAttemptAt: new Date().toISOString(),
        lastError: msg,
        ...(shouldAlert ? { alertedAt: new Date().toISOString() } : {}),
      });

      await db.payment.update({
        where: { id: payment.id },
        data: {
          extra: nextExtra,
        },
      });

      if (shouldAlert) {
        setImmediate(() => {
          alertGoogleAdsOfflinePurchaseFailure({
            paymentId: payment.id,
            orderId,
            gateway: (payment.paymentGateway ?? "unknown").toLowerCase(),
            amount,
            currency,
            userId: payment.user?.id,
            userEmail: payment.user?.email ?? null,
            adClickProvider: payment.user?.adClickProvider ?? null,
            adClickId: payment.user?.adClickId ?? null,
            customerId: env.GOOGLE_ADS_CUSTOMER_ID ?? null,
            conversionActionId: env.GOOGLE_ADS_CONVERSION_ACTION_ID ?? null,
            error: msg,
          });
        });
      }

      return { status: "failed", reason: msg, orderId };
    }

    await db.payment.update({
      where: { id: payment.id },
      data: {
        extra: setGoogleAdsExtra(payment.extra, {
          uploadedAt: new Date().toISOString(),
          lastAttemptAt: new Date().toISOString(),
          lastError: null,
        }),
      },
    });

    logger.info(
      { paymentId: payment.id, orderId, amount, currency, provider },
      "Google Ads offline purchase uploaded"
    );

    return { status: "uploaded", orderId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, paymentId: payment.id, orderId }, "Google Ads offline purchase upload failed");

    const shouldAlert = !alertedAt;
    const nextExtra = setGoogleAdsExtra(payment.extra, {
      lastAttemptAt: new Date().toISOString(),
      lastError: msg,
      ...(shouldAlert ? { alertedAt: new Date().toISOString() } : {}),
    });

    await db.payment.update({
      where: { id: payment.id },
      data: {
        extra: nextExtra,
      },
    });

    if (shouldAlert) {
      setImmediate(() => {
        alertGoogleAdsOfflinePurchaseFailure({
          paymentId: payment.id,
          orderId,
          gateway: (payment.paymentGateway ?? "unknown").toLowerCase(),
          amount,
          currency,
          userId: payment.user?.id,
          userEmail: payment.user?.email ?? null,
          adClickProvider: payment.user?.adClickProvider ?? null,
          adClickId: payment.user?.adClickId ?? null,
          customerId: env.GOOGLE_ADS_CUSTOMER_ID ?? null,
          conversionActionId: env.GOOGLE_ADS_CONVERSION_ACTION_ID ?? null,
          error: msg,
        });
      });
    }

    return { status: "failed", reason: msg, orderId };
  }
}


