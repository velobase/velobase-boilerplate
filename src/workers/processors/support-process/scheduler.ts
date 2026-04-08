/**
 * Support Process Scheduler
 *
 * 注意：process 队列不需要定时调度，由 sync 队列触发。
 * 这个文件保留用于一致性，可以用于定期扫描遗漏的工单。
 */
import { createLogger } from "@/lib/logger";

const logger = createLogger("support-process-scheduler");

export async function registerSupportProcessScheduler(): Promise<void> {
  // Process 队列由 sync 队列触发，不需要定时调度
  // 但可以添加一个兜底扫描，处理遗漏的工单
  logger.info("✅ Support process scheduler: triggered by sync queue");
}

