import { asyncSendBackendAlert } from "@/lib/lark/notifications";
import { env } from "@/env";

function truncate(value: string, max = 300) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

/**
 * Google Ads 离线回传失败报警
 */
export function alertGoogleAdsOfflinePurchaseFailure(params: {
  paymentId: string;
  orderId: string;
  gateway: string;
  amount: number;
  currency: string;
  userId?: string;
  userEmail?: string | null;
  adClickProvider?: string | null;
  adClickId?: string | null;
  customerId?: string | null;
  conversionActionId?: string | null;
  error: string;
}) {
  asyncSendBackendAlert({
    title: "Google Ads 回传失败 (offline purchase)",
    severity: "error",
    source: "payment",
    environment: env.NODE_ENV,
    service: "google-ads-offline-purchase",
    resourceId: `payment:${params.paymentId}`,
    user: params.userEmail ?? params.userId ?? undefined,
    errorName: "GoogleAdsOfflineConversionUploadFailed",
    errorMessage: truncate(params.error, 800),
    metadata: {
      paymentId: params.paymentId,
      orderId: params.orderId,
      gateway: params.gateway,
      amount: params.amount,
      currency: params.currency,
      userId: params.userId,
      email: params.userEmail,
      adClickProvider: params.adClickProvider,
      adClickId: params.adClickId ? truncate(params.adClickId, 120) : null,
      customerId: params.customerId,
      conversionActionId: params.conversionActionId,
    },
    // 让每笔单独报警，不吃 notifications.ts 的 throttle
    fingerprint: `google_ads_offline_purchase:${params.paymentId}`,
  });
}

/**
 * Google Ads 增强型转化失败报警
 */
export function alertGoogleAdsWebEnhancementFailure(params: {
  paymentId: string;
  orderId: string;
  userId?: string;
  userEmail?: string | null;
  gclid?: string | null;
  customerId?: string | null;
  conversionActionId?: string | null;
  error: string;
}) {
  asyncSendBackendAlert({
    title: "Google Ads 回传失败 (web enhancement)",
    severity: "warning", // 比 offline 低一级，因为 enhancement 不是唯一来源
    source: "payment",
    environment: env.NODE_ENV,
    service: "google-ads-web-enhancement",
    resourceId: `payment:${params.paymentId}`,
    user: params.userEmail ?? params.userId ?? undefined,
    errorName: "GoogleAdsWebEnhancementUploadFailed",
    errorMessage: truncate(params.error, 800),
    metadata: {
      paymentId: params.paymentId,
      orderId: params.orderId,
      userId: params.userId,
      email: params.userEmail,
      gclid: params.gclid ? truncate(params.gclid, 120) : null,
      customerId: params.customerId,
      conversionActionId: params.conversionActionId,
    },
    fingerprint: `google_ads_web_enhancement:${params.paymentId}`,
  });
}


