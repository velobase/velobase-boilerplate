import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import fastify, { type FastifyInstance } from "fastify";
import {
  orderCompensationQueue,
  subscriptionCompensationQueue,
  subscriptionMonthlyCreditsQueue,
  staleJobCleanupQueue,
  conversionAlertQueue,
  touchDeliveryQueue,
  supportSyncQueue,
  supportProcessQueue,
  supportSendQueue,
  googleAdsUploadQueue,
} from "./queues";

export async function createServer(): Promise<FastifyInstance> {
  const server = fastify();

  // Bull Board Setup
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath("/_worker/queues");

  createBullBoard({
    queues: [
      new BullMQAdapter(orderCompensationQueue),
      new BullMQAdapter(subscriptionMonthlyCreditsQueue),
      new BullMQAdapter(subscriptionCompensationQueue),
      new BullMQAdapter(staleJobCleanupQueue),
      new BullMQAdapter(conversionAlertQueue),
      new BullMQAdapter(touchDeliveryQueue),
      new BullMQAdapter(supportSyncQueue),
      new BullMQAdapter(supportProcessQueue),
      new BullMQAdapter(supportSendQueue),
      new BullMQAdapter(googleAdsUploadQueue),
    ],
    serverAdapter,
  });

  await server.register(serverAdapter.registerPlugin(), {
    prefix: "/_worker/queues",
  });

  // Health & Readiness Checks
  server.get("/health", async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  });

  // Readiness probe for Kubernetes
  server.get("/ready", async () => {
    // 如果后续需要更严格的就绪检查，可以在这里添加 Redis / 队列 等依赖检查
    return { status: "ready", timestamp: new Date().toISOString() };
  });

  return server;
}
