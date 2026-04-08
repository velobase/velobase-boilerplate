import { services, enums } from "google-ads-api";
import type { common } from "google-ads-api";
import { createHash } from "crypto";
import { env } from "@/env";
import { db } from "@/server/db";
import { logger } from "@/server/shared/telemetry/logger";
import { getGoogleAdsCustomer } from "./client";
import { alertGoogleAdsWebEnhancementFailure } from "./alert";

type UploadResult =
  | { status: "disabled"; reason: string }
  | { status: "skipped"; reason: string; orderId?: string }
  | { status: "uploaded"; orderId: string }
  | { status: "failed"; reason: string; orderId?: string };

function sha256(value: string): string {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

function safeObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function getNestedObject(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = obj[key];
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function setWebEnhancementExtra(
  extra: unknown,
  patch: { uploadedAt?: string; lastAttemptAt: string; lastError?: string | null; alertedAt?: string }
) {
  const base = safeObject(extra);
  const googleAds = getNestedObject(base, "googleAds");
  const webEnhancement = getNestedObject(googleAds, "webEnhancement");

  return {
    ...base,
    googleAds: {
      ...googleAds,
      webEnhancement: {
        ...webEnhancement,
        ...patch,
      },
    },
  };
}

function getWebEnhancementState(extra: unknown): {
  uploadedAt?: string;
  lastAttemptAt?: string;
  lastError?: string | null;
  alertedAt?: string;
} {
  const base = safeObject(extra);
  const googleAds = getNestedObject(base, "googleAds");
  const webEnhancement = getNestedObject(googleAds, "webEnhancement");
  return {
    uploadedAt: typeof webEnhancement.uploadedAt === "string" ? webEnhancement.uploadedAt : undefined,
    lastAttemptAt: typeof webEnhancement.lastAttemptAt === "string" ? webEnhancement.lastAttemptAt : undefined,
    lastError: typeof webEnhancement.lastError === "string" ? webEnhancement.lastError : null,
    alertedAt: typeof webEnhancement.alertedAt === "string" ? webEnhancement.alertedAt : undefined,
  };
}

function splitName(fullName: string | null): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: "", lastName: "" };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function formatGoogleAdsConversionDateTime(d: Date) {
  // "yyyy-mm-dd hh:mm:ss+00:00"
  return d.toISOString().replace("T", " ").substring(0, 19) + "+00:00";
}

/**
 * Enhanced Conversions for Web (API): ConversionAdjustment ENHANCEMENT
 * - 只用于 gclid（Google 不支持 wbraid/gbraid 的 web enhancement）
 * - 依赖前端 gtag 先打出 primary 的 “购买” 转化（order_id/transaction_id 一致）
 */
export async function uploadGoogleAdsWebPurchaseEnhancementForPayment(
  paymentId: string
): Promise<UploadResult> {
  if (!env.GOOGLE_ADS_WEB_CONVERSION_ACTION_ID) {
    return { status: "disabled", reason: "missing GOOGLE_ADS_WEB_CONVERSION_ACTION_ID" };
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
      createdAt: true,
      updatedAt: true,
      extra: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          adClickId: true,
          adClickProvider: true,
        },
      },
    },
  });

  if (!payment) return { status: "skipped", reason: "payment not found" };
  if (payment.status !== "SUCCEEDED") return { status: "skipped", reason: `payment not succeeded (${payment.status})` };
  if (!payment.orderId) return { status: "skipped", reason: "missing orderId" };

  const { uploadedAt } = getWebEnhancementState(payment.extra);
  if (uploadedAt) return { status: "skipped", reason: `already enhanced at ${uploadedAt}`, orderId: payment.orderId };

  const provider = (payment.user?.adClickProvider ?? "").toLowerCase();
  const gclid = provider === "gclid" ? payment.user?.adClickId ?? null : null;
  if (!gclid) {
    // 只对 gclid 做 web enhancement；iOS 的 gbraid/wbraid 走离线回传兜底即可
    return { status: "skipped", reason: `not gclid (${provider || "none"})`, orderId: payment.orderId };
  }

  const email = payment.user?.email?.trim().toLowerCase();
  if (!email) return { status: "skipped", reason: "missing user email", orderId: payment.orderId };

  const conversionActionResourceName = `customers/${env.GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${env.GOOGLE_ADS_WEB_CONVERSION_ACTION_ID}`;
  const conversionTime = payment.updatedAt ?? payment.createdAt ?? new Date();

  const { firstName, lastName } = splitName(payment.user?.name ?? null);

  const userIdentifiers: common.IUserIdentifier[] = [{ hashed_email: sha256(email) }];
  if (firstName || lastName) {
    userIdentifiers.push({
      address_info: {
        hashed_first_name: firstName ? sha256(firstName) : undefined,
        hashed_last_name: lastName ? sha256(lastName) : undefined,
      },
    });
  }

  const adjustment: services.IConversionAdjustment = {
    adjustment_type: enums.ConversionAdjustmentType.ENHANCEMENT,
    conversion_action: conversionActionResourceName,
    order_id: payment.orderId,
    user_identifiers: userIdentifiers,
    gclid_date_time_pair: {
      gclid,
      conversion_date_time: formatGoogleAdsConversionDateTime(conversionTime),
    },
  };

  try {
    const request = services.UploadConversionAdjustmentsRequest.create({
      customer_id: env.GOOGLE_ADS_CUSTOMER_ID,
      conversion_adjustments: [adjustment],
      partial_failure: true,
      validate_only: false,
    });

    const result = await customer.conversionAdjustmentUploads.uploadConversionAdjustments(request);

    const { alertedAt } = getWebEnhancementState(payment.extra);

    if (result.partial_failure_error) {
      const msg =
        (result.partial_failure_error as unknown as { message?: string }).message ??
        JSON.stringify(result.partial_failure_error);

      const shouldAlert = !alertedAt;
      await db.payment.update({
        where: { id: payment.id },
        data: {
          extra: setWebEnhancementExtra(payment.extra, {
            lastAttemptAt: new Date().toISOString(),
            lastError: msg,
            ...(shouldAlert ? { alertedAt: new Date().toISOString() } : {}),
          }),
        },
      });

      logger.warn({ paymentId: payment.id, orderId: payment.orderId, msg }, "Google Ads web enhancement partial failure");

      if (shouldAlert) {
        alertGoogleAdsWebEnhancementFailure({
          paymentId: payment.id,
          orderId: payment.orderId,
          userId: payment.user?.id,
          userEmail: payment.user?.email,
          gclid,
          customerId: env.GOOGLE_ADS_CUSTOMER_ID,
          conversionActionId: env.GOOGLE_ADS_WEB_CONVERSION_ACTION_ID,
          error: msg,
        });
      }

      return { status: "failed", reason: msg, orderId: payment.orderId };
    }

    await db.payment.update({
      where: { id: payment.id },
      data: {
        extra: setWebEnhancementExtra(payment.extra, {
          uploadedAt: new Date().toISOString(),
          lastAttemptAt: new Date().toISOString(),
          lastError: null,
        }),
      },
    });

    logger.info(
      { paymentId: payment.id, orderId: payment.orderId },
      "Google Ads web enhancement uploaded"
    );
    return { status: "uploaded", orderId: payment.orderId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, paymentId: payment.id, orderId: payment.orderId }, "Google Ads web enhancement upload failed");

    const { alertedAt } = getWebEnhancementState(payment.extra);
    const shouldAlert = !alertedAt;
    await db.payment.update({
      where: { id: payment.id },
      data: {
        extra: setWebEnhancementExtra(payment.extra, {
          lastAttemptAt: new Date().toISOString(),
          lastError: msg,
          ...(shouldAlert ? { alertedAt: new Date().toISOString() } : {}),
        }),
      },
    });

    if (shouldAlert) {
      alertGoogleAdsWebEnhancementFailure({
        paymentId: payment.id,
        orderId: payment.orderId,
        userId: payment.user?.id,
        userEmail: payment.user?.email,
        gclid,
        customerId: env.GOOGLE_ADS_CUSTOMER_ID,
        conversionActionId: env.GOOGLE_ADS_WEB_CONVERSION_ACTION_ID,
        error: msg,
      });
    }

    return { status: "failed", reason: msg, orderId: payment.orderId };
  }
}


