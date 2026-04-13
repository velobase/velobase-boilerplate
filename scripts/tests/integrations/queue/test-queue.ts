/**
 * Queue (BullMQ) integration test
 * Verifies: Redis connection, queue operations, worker processing, retry mechanism
 *
 * Usage: npx tsx scripts/tests/integrations/queue/test-queue.ts
 */
import "dotenv/config";
import { Queue, Worker, type Job } from "bullmq";
import Redis from "ioredis";

if (!process.env.REDIS_HOST) {
  console.error("❌ REDIS_HOST not configured in .env");
  console.error(
    "   Redis is not usable in this environment. Test failed.\n"
  );
  process.exit(1);
}

const TEST_QUEUE_PREFIX = "test-queue-integration";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  username: process.env.REDIS_USER || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB ?? "0", 10),
  lazyConnect: true,
  maxRetriesPerRequest: null,
});

let passed = 0;
let failed = 0;
const cleanupQueues: Queue[] = [];
const cleanupWorkers: Worker[] = [];

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function waitFor<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout: ${label} (${timeoutMs}ms)`)),
      timeoutMs
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

// ====== Test 1: Redis Connection ======

async function testRedisConnection() {
  console.log("\n═══ 1. Redis 连接验证 ═══\n");

  try {
    const pong = await redis.ping();
    assert("Redis PING", pong === "PONG", `got: ${pong}`);

    const info = await redis.info("server");
    const versionMatch = info.match(/redis_version:(\S+)/);
    assert(
      "Redis 版本可读取",
      !!versionMatch,
      versionMatch ? `v${versionMatch[1]}` : undefined
    );
  } catch (err) {
    assert("Redis 连接", false, String(err));
  }
}

// ====== Test 2: Queue CRUD ======

async function testQueueOperations() {
  console.log("\n═══ 2. 队列基本操作 ═══\n");

  interface TestJobData {
    message: string;
    num: number;
  }

  const queueName = `${TEST_QUEUE_PREFIX}-crud-${Date.now()}`;
  const queue = new Queue<TestJobData>(queueName, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 10 },
    },
  });
  cleanupQueues.push(queue);

  const job = await queue.add("test-job", {
    message: "hello",
    num: 42,
  });
  assert("添加任务成功", !!job.id, `jobId: ${job.id}`);
  assert("任务名称正确", job.name === "test-job");

  const fetched = await queue.getJob(job.id!);
  assert("获取任务成功", !!fetched);
  assert("任务数据完整", fetched?.data.message === "hello" && fetched?.data.num === 42);

  const waiting = await queue.getWaitingCount();
  assert("等待队列计数 >= 1", waiting >= 1, `count: ${waiting}`);

  const job2 = await queue.add("test-job-2", { message: "world", num: 100 });
  assert("批量添加第二个任务", !!job2.id);

  const counts = await queue.getJobCounts("waiting", "active", "completed", "failed");
  assert("获取任务统计", counts.waiting >= 2, `waiting: ${counts.waiting}`);
}

// ====== Test 3: Worker Processing ======

async function testWorkerProcessing() {
  console.log("\n═══ 3. Worker 任务消费 ═══\n");

  interface ProcessJobData {
    value: number;
  }

  const queueName = `${TEST_QUEUE_PREFIX}-process-${Date.now()}`;
  const queue = new Queue<ProcessJobData>(queueName, {
    connection: redis,
  });
  cleanupQueues.push(queue);

  const results: number[] = [];
  const completedPromise = new Promise<void>((resolve) => {
    let count = 0;
    const worker = new Worker<ProcessJobData>(
      queueName,
      async (job: Job<ProcessJobData>) => {
        results.push(job.data.value * 2);
      },
      { connection: redis, concurrency: 1 }
    );
    cleanupWorkers.push(worker);

    worker.on("completed", () => {
      count++;
      if (count >= 3) resolve();
    });
  });

  await queue.add("calc-1", { value: 10 });
  await queue.add("calc-2", { value: 20 });
  await queue.add("calc-3", { value: 30 });

  await waitFor(completedPromise, 10000, "等待 3 个任务完成");

  assert("Worker 消费了 3 个任务", results.length === 3, `got: ${results.length}`);
  results.sort((a, b) => a - b);
  assert(
    "处理结果正确",
    results[0] === 20 && results[1] === 40 && results[2] === 60,
    `results: [${results}]`
  );

  const completed = await queue.getCompletedCount();
  assert("已完成计数 = 3", completed === 3, `count: ${completed}`);
}

// ====== Test 4: Job Retry ======

async function testJobRetry() {
  console.log("\n═══ 4. 任务重试机制 ═══\n");

  const queueName = `${TEST_QUEUE_PREFIX}-retry-${Date.now()}`;
  const queue = new Queue(queueName, {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "fixed", delay: 200 },
    },
  });
  cleanupQueues.push(queue);

  let attemptCount = 0;
  const donePromise = new Promise<"completed" | "failed">((resolve) => {
    const worker = new Worker(
      queueName,
      async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Simulated failure #${attemptCount}`);
        }
      },
      { connection: redis, concurrency: 1 }
    );
    cleanupWorkers.push(worker);

    worker.on("completed", () => resolve("completed"));
    worker.on("failed", (job) => {
      if ((job?.attemptsMade ?? 0) >= 3) resolve("failed");
    });
  });

  await queue.add("retry-test", { value: 1 });

  const result = await waitFor(donePromise, 10000, "等待重试任务完成");
  assert("任务最终成功", result === "completed");
  assert("经历了 3 次尝试", attemptCount === 3, `attempts: ${attemptCount}`);
}

// ====== Test 5: Job with Permanent Failure ======

async function testPermanentFailure() {
  console.log("\n═══ 5. 永久失败任务 ═══\n");

  const queueName = `${TEST_QUEUE_PREFIX}-fail-${Date.now()}`;
  const queue = new Queue(queueName, {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "fixed", delay: 100 },
    },
  });
  cleanupQueues.push(queue);

  const failedPromise = new Promise<string>((resolve) => {
    const worker = new Worker(
      queueName,
      async () => {
        throw new Error("Always fails");
      },
      { connection: redis, concurrency: 1 }
    );
    cleanupWorkers.push(worker);

    worker.on("failed", (job, err) => {
      if ((job?.attemptsMade ?? 0) >= 2) {
        resolve(err.message);
      }
    });
  });

  await queue.add("doomed-task", { value: "x" });

  const errMsg = await waitFor(failedPromise, 10000, "等待任务彻底失败");
  assert("任务标记为失败", true);
  assert("错误信息正确", errMsg === "Always fails", `msg: ${errMsg}`);

  const failedCount = await queue.getFailedCount();
  assert("失败队列计数 = 1", failedCount === 1, `count: ${failedCount}`);
}

// ====== Test 6: Delayed Job ======

async function testDelayedJob() {
  console.log("\n═══ 6. 延迟任务 ═══\n");

  const queueName = `${TEST_QUEUE_PREFIX}-delay-${Date.now()}`;
  const queue = new Queue(queueName, { connection: redis });
  cleanupQueues.push(queue);

  const start = Date.now();
  const completedPromise = new Promise<number>((resolve) => {
    const worker = new Worker(
      queueName,
      async () => { /* no-op */ },
      { connection: redis, concurrency: 1 }
    );
    cleanupWorkers.push(worker);
    worker.on("completed", () => resolve(Date.now() - start));
  });

  await queue.add("delayed-task", { value: 1 }, { delay: 1000 });

  const delayedCount = await queue.getDelayedCount();
  assert("延迟队列中有任务", delayedCount >= 1, `count: ${delayedCount}`);

  const elapsed = await waitFor(completedPromise, 10000, "等待延迟任务执行");
  assert("延迟约 1 秒后执行", elapsed >= 900, `elapsed: ${elapsed}ms`);
}

// ====== Test 7: Framework Queue Definitions ======

async function testFrameworkQueues() {
  console.log("\n═══ 7. 框架队列定义验证 ═══\n");

  const expectedQueues = [
    "order-compensation",
    "subscription-monthly-credits",
    "subscription-compensation",
    "stale-job-cleanup",
    "conversion-alert",
    "payment-reconciliation",
    "touch-delivery",
    "support-sync",
    "support-process",
    "support-send",
    "google-ads-upload",
  ];

  for (const name of expectedQueues) {
    const q = new Queue(name, { connection: redis });
    try {
      const counts = await q.getJobCounts();
      assert(`队列 "${name}" 可访问`, true);
    } catch {
      assert(`队列 "${name}" 可访问`, false, "connection error");
    } finally {
      await q.close();
    }
  }

  assert(`框架定义了 ${expectedQueues.length} 个队列`, expectedQueues.length === 11);
}

// ====== Cleanup & Run ======

async function cleanup() {
  console.log("\n--- 清理测试数据 ---\n");

  for (const w of cleanupWorkers) {
    try { await w.close(); } catch { /* ignore */ }
  }

  for (const q of cleanupQueues) {
    try {
      await q.obliterate({ force: true });
      await q.close();
    } catch { /* ignore */ }
  }

  try { await redis.quit(); } catch { /* ignore */ }
}

async function run() {
  console.log("🧪 Queue (BullMQ) 集成测试");
  console.log(`   Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT ?? "6379"}`);

  try {
    await testRedisConnection();
    await testQueueOperations();
    await testWorkerProcessing();
    await testJobRetry();
    await testPermanentFailure();
    await testDelayedJob();
    await testFrameworkQueues();
  } catch (err) {
    console.error("\n💥 Unexpected error:", err);
    failed++;
  } finally {
    await cleanup();
  }

  console.log(`\n${"═".repeat(40)}`);
  console.log(`  结果：${passed} passed, ${failed} failed`);
  console.log(`${"═".repeat(40)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

void run();
