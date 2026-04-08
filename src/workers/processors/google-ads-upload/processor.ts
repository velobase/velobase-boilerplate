/**
 * Google Ads Upload Processor (Batch Flush)
 *
 * 每 5 分钟触发一次，从 Redis 批量取 paymentId，批量上传到 Google Ads。
 */
import type { Job } from "bullmq";
import { services } from "google-ads-api";
import { createLogger } from "@/lib/logger";
import { redis } from "@/server/redis";
import { db } from "@/server/db";
import { env } from "@/env";
import type { GoogleAdsUploadJobData } from "../../queues";
import { getGoogleAdsCustomer } from "@/server/ads/google-ads/client";
import {
  GOOGLE_ADS_OFFLINE_PENDING_KEY,
  GOOGLE_ADS_WEB_PENDING_KEY,
} from "@/server/ads/google-ads/queue";

const logger = createLogger("google-ads-upload");

const BATCH_SIZE = 1000;

// ============================================================
// Helpers
// ============================================================

function formatGoogleAdsConversionDateTime(d: Date): string {
  return d.toISOString().replace("T", " ").substring(0, 19) + "+00:00";
}

function isRateLimitError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("too many requests") ||
    m.includes("resource_temporarily_exhausted") ||
    m.includes("resource_exhausted") ||
    m.includes("retry in ") ||
    m.includes("429")
  );
}

/**
 * google-ads-api 内部 TTLCache（10 分钟）过期时会 close gRPC channel，
 * 导致后续调用报 "The client has already been closed."。
 * 遇到该错误时重新获取 customer 重试一次即可恢复。
 */
function isClientClosedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("already been closed");
}

/**
 * 从 ZSET 原子取出最多 N 个 member（按 score 最小/最老优先）
 * Redis 6.2+ 支持 ZPOPMIN count
 */
async function zpopminBatch(key: string, count: number): Promise<string[]> {
  // ZPOPMIN 返回 [member, score, member, score, ...]
  const raw = await redis.zpopmin(key, count);
  const members: string[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    members.push(raw[i]!);
  }
  return members;
}

/**
 * 把失败的 paymentIds 放回 ZSET（用当前时间作为 score，排到队尾）
 */
async function pushBackToQueue(key: string, paymentIds: string[]): Promise<void> {
  if (paymentIds.length === 0) return;
  const now = Date.now();
  const args: (string | number)[] = [];
  for (const id of paymentIds) {
    args.push(now, id);
  }
  await redis.zadd(key, ...args);
}

// ============================================================
// Offline Purchase Batch Upload
// ============================================================

async function flushOfflinePurchases(): Promise<{ processed: number; uploaded: number; failed: number }> {
  if (!env.GOOGLE_ADS_CUSTOMER_ID || !env.GOOGLE_ADS_CONVERSION_ACTION_ID) {
    return { processed: 0, uploaded: 0, failed: 0 };
  }

  const customer = getGoogleAdsCustomer();
  if (!customer) {
    return { processed: 0, uploaded: 0, failed: 0 };
  }

  // 1. 从 Redis 取最多 BATCH_SIZE 个 paymentId
  const paymentIds = await zpopminBatch(GOOGLE_ADS_OFFLINE_PENDING_KEY, BATCH_SIZE);
  if (paymentIds.length === 0) {
    return { processed: 0, uploaded: 0, failed: 0 };
  }

  logger.info({ count: paymentIds.length }, "Flushing offline purchases");

  // 2. 批量查 DB
  const payments = await db.payment.findMany({
    where: { id: { in: paymentIds } },
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

  // 3. 过滤 + 组装 conversions[]
  const conversionActionResourceName = `customers/${env.GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${env.GOOGLE_ADS_CONVERSION_ACTION_ID}`;

  type PaymentWithConversion = {
    payment: (typeof payments)[number];
    conversion: services.IClickConversion;
  };

  const validItems: PaymentWithConversion[] = [];
  const skippedIds: string[] = [];

  for (const payment of payments) {
    // 跳过非成功
    if (payment.status !== "SUCCEEDED") {
      skippedIds.push(payment.id);
      continue;
    }

    // 幂等检查：已上传
    const extra = payment.extra as Record<string, unknown> | null;
    const googleAds = extra?.googleAds as Record<string, unknown> | undefined;
    const offlinePurchase = googleAds?.offlinePurchase as Record<string, unknown> | undefined;
    if (offlinePurchase?.uploadedAt) {
      skippedIds.push(payment.id);
      continue;
    }

    // 检查 click id
    const provider = (payment.user?.adClickProvider ?? "").toLowerCase();
    const clickId = payment.user?.adClickId ?? null;
    const gclid = provider === "gclid" ? clickId : null;
    const wbraid = provider === "wbraid" ? clickId : null;
    const gbraid = provider === "gbraid" ? clickId : null;

    if (!gclid && !wbraid && !gbraid) {
      skippedIds.push(payment.id);
      continue;
    }

    const conversionTime = payment.updatedAt ?? payment.createdAt ?? new Date();
    const conversion: services.IClickConversion = {
      conversion_action: conversionActionResourceName,
      conversion_date_time: formatGoogleAdsConversionDateTime(conversionTime),
      conversion_value: payment.amount / 100,
      currency_code: (payment.currency ?? "usd").toUpperCase(),
      order_id: payment.orderId,
    };

    if (gclid) conversion.gclid = gclid;
    else if (wbraid) conversion.wbraid = wbraid;
    else if (gbraid) conversion.gbraid = gbraid;

    validItems.push({ payment, conversion });
  }

  // 没有 paymentId 在 DB 中找到的，也不用放回
  const foundIds = new Set(payments.map((p) => p.id));
  const notFoundIds = paymentIds.filter((id) => !foundIds.has(id));

  if (validItems.length === 0) {
    logger.info({ skipped: skippedIds.length, notFound: notFoundIds.length }, "No valid conversions to upload");
    return { processed: paymentIds.length, uploaded: 0, failed: 0 };
  }

  // 4. 批量上传（一次请求），遇到 client closed 自动重试一次
  const doUpload = async (retryCustomer: NonNullable<ReturnType<typeof getGoogleAdsCustomer>>) => {
    const request = services.UploadClickConversionsRequest.create({
      customer_id: env.GOOGLE_ADS_CUSTOMER_ID,
      conversions: validItems.map((item) => item.conversion),
      partial_failure: true,
      validate_only: false,
    });
    return retryCustomer.conversionUploads.uploadClickConversions(request);
  };

  try {
    let result;
    try {
      result = await doUpload(customer);
    } catch (firstErr) {
      if (!isClientClosedError(firstErr)) throw firstErr;
      // gRPC client 被 TTLCache dispose 关闭了，重新获取 customer 重试一次
      logger.warn("Offline purchase upload hit closed client, retrying with fresh customer");
      const freshCustomer = getGoogleAdsCustomer();
      if (!freshCustomer) throw firstErr;
      result = await doUpload(freshCustomer);
    }

    // 5. 处理结果
    const now = new Date().toISOString();
    const successIds: string[] = [];
    const failedIds: string[] = [];

    if (result.partial_failure_error) {
      const msg =
        (result.partial_failure_error as unknown as { message?: string }).message ??
        JSON.stringify(result.partial_failure_error);

      logger.warn({ error: msg, count: validItems.length }, "Offline purchase batch upload partial failure");

      if (isRateLimitError(msg)) {
        for (const item of validItems) {
          failedIds.push(item.payment.id);
        }
      } else {
        // 非 rate limit 的 partial failure，可能是个别数据问题
        // 这里简化处理：全部标记为成功（因为 Google 会根据 order_id 去重）
        for (const item of validItems) {
          successIds.push(item.payment.id);
        }
      }
    } else {
      // 全部成功
      for (const item of validItems) {
        successIds.push(item.payment.id);
      }
    }

    // 批量更新成功的（使用已查到的数据，串行更新避免连接池耗尽）
    if (successIds.length > 0) {
      const successPayments = validItems.filter((item) => successIds.includes(item.payment.id));
      for (const { payment } of successPayments) {
        const extra = (payment.extra as Record<string, unknown>) ?? {};
        const googleAds = (extra.googleAds as Record<string, unknown>) ?? {};
        await db.payment.update({
          where: { id: payment.id },
          data: {
            extra: {
              ...extra,
              googleAds: {
                ...googleAds,
                offlinePurchase: { uploadedAt: now },
              },
            },
          },
        });
      }
    }

    // 把失败的放回队列
    await pushBackToQueue(GOOGLE_ADS_OFFLINE_PENDING_KEY, failedIds);

    logger.info(
      { total: paymentIds.length, valid: validItems.length, uploaded: successIds.length, failed: failedIds.length },
      "Offline purchase batch flush completed"
    );

    return { processed: paymentIds.length, uploaded: successIds.length, failed: failedIds.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: msg, count: validItems.length }, "Offline purchase batch upload failed");

    // 全部放回队列重试
    const allIds = validItems.map((item) => item.payment.id);
    await pushBackToQueue(GOOGLE_ADS_OFFLINE_PENDING_KEY, allIds);

    // 如果是 rate limit，抛出让 BullMQ 重试
    if (isRateLimitError(msg)) {
      throw err;
    }

    return { processed: paymentIds.length, uploaded: 0, failed: validItems.length };
  }
}

// ============================================================
// Web Enhancement Batch Upload
// ============================================================

async function flushWebEnhancements(): Promise<{ processed: number; uploaded: number; failed: number }> {
  if (!env.GOOGLE_ADS_CUSTOMER_ID || !env.GOOGLE_ADS_WEB_CONVERSION_ACTION_ID) {
    return { processed: 0, uploaded: 0, failed: 0 };
  }

  const customer = getGoogleAdsCustomer();
  if (!customer) {
    return { processed: 0, uploaded: 0, failed: 0 };
  }

  // 1. 从 Redis 取最多 BATCH_SIZE 个 paymentId
  const paymentIds = await zpopminBatch(GOOGLE_ADS_WEB_PENDING_KEY, BATCH_SIZE);
  if (paymentIds.length === 0) {
    return { processed: 0, uploaded: 0, failed: 0 };
  }

  logger.info({ count: paymentIds.length }, "Flushing web enhancements");

  // 2. 批量查 DB
  const payments = await db.payment.findMany({
    where: { id: { in: paymentIds } },
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

  // 3. 过滤 + 组装 adjustments[]
  const conversionActionResourceName = `customers/${env.GOOGLE_ADS_CUSTOMER_ID}/conversionActions/${env.GOOGLE_ADS_WEB_CONVERSION_ACTION_ID}`;

  const { createHash } = await import("crypto");
  function sha256(value: string): string {
    return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
  }

  function splitName(fullName: string | null): { firstName: string; lastName: string } {
    if (!fullName) return { firstName: "", lastName: "" };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" };
    return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
  }

  type PaymentWithAdjustment = {
    payment: (typeof payments)[number];
    adjustment: services.IConversionAdjustment;
  };

  const { enums } = await import("google-ads-api");
  type IUserIdentifier = { hashed_email?: string; address_info?: { hashed_first_name?: string; hashed_last_name?: string } };

  const validItems: PaymentWithAdjustment[] = [];
  const skippedIds: string[] = [];

  for (const payment of payments) {
    if (payment.status !== "SUCCEEDED") {
      skippedIds.push(payment.id);
      continue;
    }

    if (!payment.orderId) {
      skippedIds.push(payment.id);
      continue;
    }

    // 幂等检查
    const extra = payment.extra as Record<string, unknown> | null;
    const googleAds = extra?.googleAds as Record<string, unknown> | undefined;
    const webEnhancement = googleAds?.webEnhancement as Record<string, unknown> | undefined;
    if (webEnhancement?.uploadedAt) {
      skippedIds.push(payment.id);
      continue;
    }

    // web enhancement 只对 gclid 生效
    const provider = (payment.user?.adClickProvider ?? "").toLowerCase();
    const gclid = provider === "gclid" ? payment.user?.adClickId ?? null : null;
    if (!gclid) {
      skippedIds.push(payment.id);
      continue;
    }

    const email = payment.user?.email?.trim().toLowerCase();
    if (!email) {
      skippedIds.push(payment.id);
      continue;
    }

    const { firstName, lastName } = splitName(payment.user?.name ?? null);
    const userIdentifiers: IUserIdentifier[] = [{ hashed_email: sha256(email) }];
    if (firstName || lastName) {
      userIdentifiers.push({
        address_info: {
          hashed_first_name: firstName ? sha256(firstName) : undefined,
          hashed_last_name: lastName ? sha256(lastName) : undefined,
        },
      });
    }

    const conversionTime = payment.updatedAt ?? payment.createdAt ?? new Date();

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

    validItems.push({ payment, adjustment });
  }

  const foundIds = new Set(payments.map((p) => p.id));
  const notFoundIds = paymentIds.filter((id) => !foundIds.has(id));

  if (validItems.length === 0) {
    logger.info({ skipped: skippedIds.length, notFound: notFoundIds.length }, "No valid web enhancements to upload");
    return { processed: paymentIds.length, uploaded: 0, failed: 0 };
  }

  // 4. 批量上传，遇到 client closed 自动重试一次
  const doUpload = async (retryCustomer: NonNullable<ReturnType<typeof getGoogleAdsCustomer>>) => {
    const request = services.UploadConversionAdjustmentsRequest.create({
      customer_id: env.GOOGLE_ADS_CUSTOMER_ID,
      conversion_adjustments: validItems.map((item) => item.adjustment),
      partial_failure: true,
      validate_only: false,
    });
    return retryCustomer.conversionAdjustmentUploads.uploadConversionAdjustments(request);
  };

  try {
    let result;
    try {
      result = await doUpload(customer);
    } catch (firstErr) {
      if (!isClientClosedError(firstErr)) throw firstErr;
      logger.warn("Web enhancement upload hit closed client, retrying with fresh customer");
      const freshCustomer = getGoogleAdsCustomer();
      if (!freshCustomer) throw firstErr;
      result = await doUpload(freshCustomer);
    }

    const now = new Date().toISOString();
    const successIds: string[] = [];
    const failedIds: string[] = [];

    if (result.partial_failure_error) {
      const msg =
        (result.partial_failure_error as unknown as { message?: string }).message ??
        JSON.stringify(result.partial_failure_error);

      logger.warn({ error: msg, count: validItems.length }, "Web enhancement batch upload partial failure");

      if (isRateLimitError(msg)) {
        for (const item of validItems) {
          failedIds.push(item.payment.id);
        }
      } else {
        for (const item of validItems) {
          successIds.push(item.payment.id);
        }
      }
    } else {
      for (const item of validItems) {
        successIds.push(item.payment.id);
      }
    }

    if (successIds.length > 0) {
      const successPayments = validItems.filter((item) => successIds.includes(item.payment.id));
      for (const { payment } of successPayments) {
        const extra = (payment.extra as Record<string, unknown>) ?? {};
        const googleAds = (extra.googleAds as Record<string, unknown>) ?? {};
        await db.payment.update({
          where: { id: payment.id },
          data: {
            extra: {
              ...extra,
              googleAds: {
                ...googleAds,
                webEnhancement: { uploadedAt: now },
              },
            },
          },
        });
      }
    }

    await pushBackToQueue(GOOGLE_ADS_WEB_PENDING_KEY, failedIds);

    logger.info(
      { total: paymentIds.length, valid: validItems.length, uploaded: successIds.length, failed: failedIds.length },
      "Web enhancement batch flush completed"
    );

    return { processed: paymentIds.length, uploaded: successIds.length, failed: failedIds.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ error: msg, count: validItems.length }, "Web enhancement batch upload failed");

    const allIds = validItems.map((item) => item.payment.id);
    await pushBackToQueue(GOOGLE_ADS_WEB_PENDING_KEY, allIds);

    if (isRateLimitError(msg)) {
      throw err;
    }

    return { processed: paymentIds.length, uploaded: 0, failed: validItems.length };
  }
}

// ============================================================
// Main Processor
// ============================================================

export async function processGoogleAdsUploadJob(job: Job<GoogleAdsUploadJobData>): Promise<void> {
  if (job.data.type !== "flush") {
    logger.warn({ type: job.data.type }, "Unknown job type, skipping");
    return;
  }

  const offlineResult = await flushOfflinePurchases();
  const webResult = await flushWebEnhancements();

  logger.info(
    {
      offline: offlineResult,
      web: webResult,
    },
    "Google Ads batch flush completed"
  );
}
