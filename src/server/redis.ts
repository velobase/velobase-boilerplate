import Redis from "ioredis";
import { env } from "@/env";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Next.js 在 `next build` 阶段会设置该环境变量
// 此时不应该去真实连接 Redis，避免 CI / 构建环境连不上而报错
const isNextBuild = process.env.NEXT_PHASE === "phase-production-build";

const createRedis = () =>
  new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    username: env.REDIS_USER,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB,
    // 懒连接：只有真正发命令时才去连，避免仅仅 import 时就尝试连接
    lazyConnect: true,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: null, // BullMQ requires this to be null
  });

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

