/**
 * Conversion Alert Processor
 *
 * 每小时发送业务指标报表到 Lark
 * - 00:00（LA）：发送日报到"天"群
 * - 其他时间：发送小时报到"小时"群
 */
import type { Job } from "bullmq";
import { createLogger } from "@/lib/logger";
import { getLarkBot, LARK_CHAT_IDS } from "@/lib/lark";
import type { ConversionAlertJobData } from "../../queues/conversion-alert.queue";
import { generateHourlyReport } from "./generate-report";
import { buildMetricsCard } from "./build-card";

const logger = createLogger("conversion-alert");

export async function processConversionAlert(
  job: Job<ConversionAlertJobData>
): Promise<void> {
  if (job.data.type !== "hourly-check") {
    return;
  }

  // 非 production 环境不发送业务指标报告
  if (process.env.NODE_ENV !== "production") {
    logger.info("Skipping metrics report in non-production environment");
    return;
  }

  logger.info("Generating hourly business metrics report");

  try {
    // 判断当前 LA 时间是否为 00:xx（日报）
    const now = new Date();
    const currentHourLA = parseInt(
      now.toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        hourCycle: "h23",
        hour: "numeric"
      })
    );
    const isDaily = currentHourLA === 0;

    // 日报模式：查询昨日数据 vs 前日数据
    const report = await generateHourlyReport({ isDaily });
    const card = buildMetricsCard(report, { isDaily });
    const bot = getLarkBot();

    // 00:00 发到"天"群，其他时间发到"小时"群
    const chatId = isDaily
      ? LARK_CHAT_IDS.CONVERSION_ALERT_DAILY
      : LARK_CHAT_IDS.CONVERSION_ALERT;

    await bot.sendCard(chatId, card);

    logger.info(
      { isDaily, chatId },
      isDaily ? "Daily metrics report sent" : "Hourly metrics report sent"
    );
  } catch (error) {
    logger.error({ error }, "Failed to send metrics report");
    throw error;
  }
}
