/**
 * Stale Job Cleanup Processor
 *
 * Generic cleanup for stale/stuck jobs across all queues.
 * Add your own queue-specific cleanup logic as needed.
 */
import type { Job } from "bullmq";
import { createLogger } from "@/lib/logger";
import type { StaleJobCleanupJobData } from "../../queues/stale-job-cleanup.queue";

const logger = createLogger("stale-job-cleanup");

export async function processStaleJobCleanup(
  job: Job<StaleJobCleanupJobData>
): Promise<void> {
  if (job.data.type !== "scheduled-scan") {
    return;
  }

  logger.info("Starting stale job cleanup scan");

  // Add your queue-specific stale job cleanup logic here.
  // Example: iterate over queues, find jobs older than a threshold,
  // and move them to failed or remove them.

  logger.info("Stale job cleanup completed");
}
