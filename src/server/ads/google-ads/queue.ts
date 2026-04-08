import { env } from "@/env";
import { redis } from "@/server/redis";

export const GOOGLE_ADS_OFFLINE_PENDING_KEY = "google-ads:pending:offline";
export const GOOGLE_ADS_WEB_PENDING_KEY = "google-ads:pending:web";

export async function enqueueGoogleAdsOfflinePurchaseUpload(paymentId: string): Promise<void> {
  // Fast fail: feature disabled / not configured
  if (!env.GOOGLE_ADS_CUSTOMER_ID || !env.GOOGLE_ADS_CONVERSION_ACTION_ID) return;

  const now = Date.now();
  // 用 ZSET 去重；score=时间戳便于最老优先 flush
  await redis.zadd(GOOGLE_ADS_OFFLINE_PENDING_KEY, now, paymentId);
}

export async function enqueueGoogleAdsWebEnhancementUpload(paymentId: string): Promise<void> {
  if (!env.GOOGLE_ADS_CUSTOMER_ID || !env.GOOGLE_ADS_WEB_CONVERSION_ACTION_ID) return;

  const now = Date.now();
  await redis.zadd(GOOGLE_ADS_WEB_PENDING_KEY, now, paymentId);
}

export async function enqueueGoogleAdsUploadsForPayment(paymentId: string): Promise<void> {
  await Promise.all([
    enqueueGoogleAdsOfflinePurchaseUpload(paymentId),
    enqueueGoogleAdsWebEnhancementUpload(paymentId),
  ]);
}

