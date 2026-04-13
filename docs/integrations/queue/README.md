# 后台任务（Queue）— Redis + BullMQ

## 选型

后台任务用于处理不适合在 HTTP 请求中同步完成的工作（耗时操作、定时任务、重试逻辑）。


| 方案         | 选择  | 理由                                            |
| ---------- | --- | --------------------------------------------- |
| **BullMQ** | 已选  | 基于 Redis、TypeScript 原生、成熟稳定、支持 Cron/延迟/重试/优先级 |
| Agenda     | 不选  | 依赖 MongoDB，框架使用 PostgreSQL                    |
| node-cron  | 不选  | 仅定时触发，无队列/重试/持久化能力                            |
| Temporal   | 不选  | 重量级编排引擎，独立部署成本高                               |


选型结论：**只支持 BullMQ**，复用 Database 层已有的 Redis，零额外基础设施。

## 架构设计

### 双进程架构

```
┌────────────────────┐         ┌────────────────────┐
│  Web 服务 (:3000)   │         │  Worker 服务 (:3001) │
│  Next.js            │         │  Fastify + BullMQ   │
│                     │         │                     │
│  业务代码            │         │  processors/        │
│  queue.add(job) ────┼── Redis ──▶ processXxxJob()  │
│                     │         │                     │
│                     │         │  /_worker/queues     │
│                     │         │  (Bull Board UI)     │
└────────────────────┘         └────────────────────┘
```

- **Web 进程**：通过 `queue.add()` 将任务投入 Redis
- **Worker 进程**：独立启动，从 Redis 消费并执行任务
- **Bull Board**：Worker 进程暴露的可视化面板，查看队列状态

### 代码组织

```
src/workers/
├── index.ts                      # Worker 入口（注册所有 worker + scheduler）
├── server.ts                     # Fastify HTTP（健康检查 + Bull Board）
├── utils/
│   └── create-worker.ts          # Worker 工厂（统一事件处理 + 告警）
├── queues/
│   ├── index.ts                  # 队列汇总导出
│   └── <name>.queue.ts           # 每个队列一个文件
└── processors/
    ├── index.ts                  # 处理器汇总导出
    └── <name>/
        ├── index.ts              # 导出 processor + scheduler
        ├── processor.ts          # 任务处理逻辑
        └── scheduler.ts          # Cron 注册（可选）

业务模块内的 worker（推荐方式）：
src/modules/<name>/worker/
├── queue.ts                      # 队列定义
├── processor.ts                  # 处理逻辑
└── index.ts                      # 导出
```

### 每个队列的标准三件套


| 文件             | 职责                                         | 必须      |
| -------------- | ------------------------------------------ | ------- |
| `queue.ts`     | 定义 Queue 实例 + JobData 类型 + 队列名常量           | 是       |
| `processor.ts` | 处理函数 `processXxxJob(job: Job<XxxJobData>)` | 是       |
| `scheduler.ts` | Cron 定时任务注册（通过 `queue.add()` + `repeat`）   | 仅定时任务需要 |


## 接口定义

### 派发任务（Web 进程中）

```typescript
import { orderCompensationQueue } from '@/workers/queues'

// 事件驱动型：业务逻辑中主动派发
await orderCompensationQueue.add('manual-check', {
  type: 'manual-check',
  paymentId: 'pay_xxx',
})
```

### 定义新队列

```typescript
// src/workers/queues/my-task.queue.ts
import { Queue } from 'bullmq'
import { redis } from '@/server/redis'

export const MY_TASK_QUEUE_NAME = 'my-task'

export interface MyTaskJobData {
  userId: string
  action: 'process' | 'cleanup'
}

export const myTaskQueue = new Queue<MyTaskJobData>(MY_TASK_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
})
```

### 定义处理器

```typescript
// src/workers/processors/my-task/processor.ts
import type { Job } from 'bullmq'
import type { MyTaskJobData } from '../../queues/my-task.queue'

export async function processMyTaskJob(job: Job<MyTaskJobData>) {
  const { userId, action } = job.data
  // 处理逻辑
}
```

### Worker 工厂

```typescript
import { createWorkerInstance } from '@/workers/utils/create-worker'

const myTaskWorker = createWorkerInstance('my-task', processMyTaskJob, {
  concurrency: 2,
  lockDuration: 300000,
})
```

`createWorkerInstance` 自动处理：

- `active` / `completed` / `failed` / `stalled` 事件日志
- 任务失败时发送飞书告警
- Worker 实例错误告警

## 配置

### 环境变量


| 变量               | 必填  | 默认值    | 说明                         |
| ---------------- | --- | ------ | -------------------------- |
| `REDIS_HOST`     | 是   | —      | Redis 主机地址（与 Database 层共用） |
| `REDIS_PORT`     | 是   | —      | Redis 端口                   |
| `REDIS_PASSWORD` | 否   | —      | Redis 密码                   |
| `REDIS_USER`     | 否   | —      | Redis 用户名                  |
| `REDIS_DB`       | 否   | `0`    | Redis 数据库编号                |
| `WORKER_PORT`    | 否   | `3001` | Worker HTTP 服务端口           |


无需额外 API Key——BullMQ 完全运行在本地 Redis 上。

### 启动方式

```bash
# 开发环境（两个终端）
pnpm dev           # Web 服务 :3000
pnpm worker:dev    # Worker 服务 :3001（热重载）

# 生产环境
pnpm worker:prod   # Worker 服务
```

### Docker Compose

Redis 已包含在 `docker-compose.yml` 中，Worker 作为本地 Node 进程启动，无需额外容器。

生产部署时，Worker 应作为独立容器运行：

```yaml
worker:
  build: .
  command: pnpm worker:prod
  depends_on:
    - redis
  environment:
    - REDIS_HOST=redis
    - REDIS_PORT=6379
```

## 异常处理

### 重试策略

所有队列默认配置：

```typescript
defaultJobOptions: {
  attempts: 3,                           // 最多重试 3 次
  backoff: { type: 'exponential', delay: 5000 },  // 5s → 10s → 20s
  removeOnComplete: { count: 100 },      // 保留最近 100 个成功任务
  removeOnFail: { count: 500 },          // 保留最近 500 个失败任务
}
```

### Worker 事件处理（自动）

`createWorkerInstance` 自动挂载：


| 事件          | 行为                                |
| ----------- | --------------------------------- |
| `active`    | 记录 info 日志（jobId、jobName、data）    |
| `completed` | 记录 info 日志                        |
| `failed`    | 记录 error 日志 + 飞书告警（含 stack trace） |
| `stalled`   | 记录 warn 日志 + 飞书告警                 |
| `error`     | 记录 error 日志 + 飞书 critical 告警      |


### 卡死任务清理

`stale-job-cleanup` 队列定期扫描所有队列中的卡死任务。

### 优雅关闭

Worker 进程监听 `SIGTERM` / `SIGINT`，按顺序关闭：Workers → Queues → Redis 连接。

## 监控

- **Bull Board UI**：`http://localhost:3001/_worker/queues`，可视化查看所有队列状态
- **健康检查**：`GET http://localhost:3001/health` → `{ status: "ok" }`
- **就绪探针**：`GET http://localhost:3001/ready` → `{ status: "ready" }`（K8s 兼容）

## AI 引导

### 添加新的后台任务（AI 标准流程）

1. 创建队列定义文件 `src/workers/queues/<name>.queue.ts`
  - 定义 `Queue` 实例 + `JobData` 类型 + 队列名常量
2. 创建处理器目录 `src/workers/processors/<name>/`
  - `processor.ts`：处理函数
  - `scheduler.ts`：如果是定时任务，注册 Cron
  - `index.ts`：导出
3. 注册到 `src/workers/queues/index.ts`（导出队列）
4. 注册到 `src/workers/processors/index.ts`（导出处理器）
5. 在 `src/workers/index.ts` 中：
  - 创建 `createWorkerInstance()`
  - 调用 `registerXxxScheduler()`（如有）
  - 添加到 `shutdown()` 中
  - 添加到 `server.ts` 的 Bull Board 中

**参考模板**：`src/modules/example/worker/` 是完整的示例。

### 两种任务类型

**定时任务**（Cron）— 框架自动执行：

```typescript
// scheduler.ts
await myQueue.add('scan', { type: 'scheduled-scan' }, {
  repeat: { pattern: '*/10 * * * *' },  // 每 10 分钟
  jobId: 'my-scheduled-scan',           // 固定 ID 防重复
})
```

**事件驱动**— 业务代码主动派发：

```typescript
// 在 tRPC router / webhook handler / 任意 server 代码中
await myQueue.add('process-item', { userId, itemId })
```

### 常见错误

- **忘记注册到 `index.ts`** — Worker 不会消费任务，任务堆积
- **忘记添加到 `shutdown()`** — 进程退出时任务可能丢失
- **并发设置过高** — 可能导致 Redis 连接池耗尽，默认 2 即可
- **忘记添加到 Bull Board** — 不影响功能，但无法在 UI 中监控

### 不要修改的部分

- `create-worker.ts` — Worker 工厂，统一事件处理和告警
- `server.ts` — Fastify + Bull Board 配置
- `redis.ts` 中的 `maxRetriesPerRequest: null` — BullMQ 强制要求

