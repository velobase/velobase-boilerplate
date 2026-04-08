import { redis } from "@/server/redis";
import { randomUUID } from "crypto";
import { createLogger } from "@/lib/logger";

const logger = createLogger("handoff");

export interface HandoffPayload {
  prompt: string;
  appId: string; // AgentApp ID selected on homepage
  // Optional metadata for analytics/future use
  agentName?: string;
  createdAt: number; // epoch ms
}

const HANDOFF_TTL_SECONDS = 10 * 60; // 10 minutes

function buildKey(id: string): string {
  return `handoff:${id}`;
}

export async function createHandoff(
  payload: Omit<HandoffPayload, "createdAt">,
  ttlSeconds = HANDOFF_TTL_SECONDS
): Promise<{ id: string }> {
  const id = randomUUID();
  const value: HandoffPayload = { ...payload, createdAt: Date.now() };
  const key = buildKey(id);

  await redis.setex(key, ttlSeconds, JSON.stringify(value));

  logger.info({ handoffId: id, appId: payload.appId }, "Handoff created");

  return { id };
}

export async function consumeHandoff(id: string): Promise<HandoffPayload | null> {
  const key = buildKey(id);

  // Use atomic GETDEL command (supported in Redis >= 6.2)
  // ioredis will automatically send this command if Redis version supports it
  try {
    const raw = await redis.getdel(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as HandoffPayload;
    logger.info({ handoffId: id, appId: parsed.appId }, "Handoff consumed");
    return parsed;
  } catch {
    // If GETDEL is not supported, fallback to GET + DEL using pipeline
    const pipeline = redis.pipeline();
    pipeline.get(key);
    pipeline.del(key);
    
    const results = await pipeline.exec();
    if (!results) return null;

    const [getResult] = results;
    if (!getResult || getResult[0]) {
      // Error occurred
      return null;
    }

    const raw = getResult[1];
    if (typeof raw !== "string") return null;

    try {
      const parsed = JSON.parse(raw) as HandoffPayload;
      logger.info({ handoffId: id, appId: parsed.appId }, "Handoff consumed");
      return parsed;
    } catch {
      return null;
    }
  }
}


