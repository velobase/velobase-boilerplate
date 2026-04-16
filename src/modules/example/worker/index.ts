export { processExampleJob } from "./processor";
export { exampleQueue, EXAMPLE_QUEUE_NAME, type ExampleJobData } from "./queue";

/**
 * Register a repeatable scheduler for the example module.
 * Call this in src/workers/index.ts during startup.
 */
export async function registerExampleScheduler() {
  // Example: run a cleanup job every hour
  // await exampleQueue.upsertJobScheduler(
  //   "example-hourly-cleanup",
  //   { every: 60 * 60 * 1000 },
  //   {
  //     name: "hourly-cleanup",
  //     data: { itemId: "", userId: "", action: "cleanup" as const },
  //   },
  // );
}
