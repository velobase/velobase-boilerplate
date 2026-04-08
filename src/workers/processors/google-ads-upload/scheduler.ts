/**
 * Google Ads Upload Scheduler
 *
 * 每 5 分钟 flush 一次 Redis buffer，批量上传（最多 1000 条/类型/次）。
 */
import { googleAdsUploadQueue } from "../../queues";
import { createLogger } from "@/lib/logger";

const logger = createLogger("google-ads-upload-scheduler");

export async function registerGoogleAdsUploadScheduler(): Promise<void> {
  await googleAdsUploadQueue.add(
    "flush",
    { type: "flush" },
    {
      repeat: { pattern: "*/5 * * * *" }, // every 5 minutes
      jobId: "google-ads-upload-flush",
    }
  );
  logger.info("✅ Google Ads upload scheduler registered: */5 * * * *");
}

