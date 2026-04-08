import type { Job } from "bullmq";
import { createLogger } from "@/lib/logger";
import type { ExampleJobData } from "./queue";

const logger = createLogger("example-processor");

/**
 * Process an example background job.
 * Replace with your actual async processing logic
 * (e.g., calling an external API, running AI inference, sending emails).
 */
export async function processExampleJob(job: Job<ExampleJobData>) {
  const { itemId, userId, action } = job.data;

  logger.info({ jobId: job.id, itemId, userId, action }, "Processing example job");

  switch (action) {
    case "process":
      // Your async processing logic here
      // e.g., call external API, run AI inference, etc.
      logger.info({ itemId }, "Item processed successfully");
      break;

    case "cleanup":
      // Cleanup logic
      logger.info({ itemId }, "Item cleanup completed");
      break;

    default:
      logger.warn({ action }, "Unknown action type");
  }
}
