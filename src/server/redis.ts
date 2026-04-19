import Redis from "ioredis";
import { env } from "@/env";
import { createLogger } from "@/lib/logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Next.js 在 `next build` 阶段会设置该环境变量
// 此时不应该去真实连接 Redis，避免 CI / 构建环境连不上而报错
const isNextBuild = process.env.NEXT_PHASE === "phase-production-build";

const SHARED_REDIS_OPTS = {
  lazyConnect: true,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: null as null, // BullMQ requires this to be null
} as const;

const createRedis = () => {
  const log = createLogger("redis");

  if (env.REDIS_URL) {
    const url = new URL(env.REDIS_URL);
    log.info({ host: url.hostname, port: url.port || "6379", mode: "url" }, "Connecting via REDIS_URL");
    return new Redis(env.REDIS_URL, SHARED_REDIS_OPTS);
  }

  if (!env.REDIS_HOST) {
    throw new Error("Either REDIS_URL or REDIS_HOST must be set");
  }

  const port = env.REDIS_PORT ?? 6379;
  log.info({ host: env.REDIS_HOST, port, db: env.REDIS_DB, mode: "host" }, "Connecting via REDIS_HOST");

  return new Redis({
    host: env.REDIS_HOST,
    port,
    username: env.REDIS_USER,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    ...SHARED_REDIS_OPTS,
  });
};

// 构建阶段导出一个轻量 stub，避免 ioredis 去建立真实连接
const redisStub = {
  // 常用方法给出安全的默认实现，防止偶尔在构建期被调用挂掉
  async setex() {
    return "OK";
  },
  async get() {
    return null;
  },
  async getdel() {
    return null;
  },
  async set() {
    return "OK";
  },
  async del() {
    return 0;
  },
  pipeline() {
    const commands: unknown[] = [];
    return {
      get(...args: unknown[]) {
        commands.push(["get", args]);
        return this;
      },
      del(...args: unknown[]) {
        commands.push(["del", args]);
        return this;
      },
      async exec() {
        return commands.map(() => [null, null]);
      },
    };
  },
} as unknown as Redis;

export const redis: Redis =
  isNextBuild ? redisStub : globalForRedis.redis ?? createRedis();

if (!isNextBuild && env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

