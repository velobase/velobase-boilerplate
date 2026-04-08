# AI SaaS Framework — 开发指南

本文档用于指导基于本框架开发新的 AI SaaS 产品。涵盖框架架构、代码边界划分、从框架到生产应用的分阶段 Checklist，以及关键架构决策说明。

---

## 目录

1. [框架架构概览](#1-框架架构概览)
2. [最小配置快速启动](#2-最小配置快速启动)
3. [框架 vs 业务 — 代码边界清单](#3-框架-vs-业务--代码边界清单)
4. [从框架到生产应用 — 分阶段 Checklist](#4-从框架到生产应用--分阶段-checklist)
5. [关键架构决策说明](#5-关键架构决策说明)
6. [第三方服务选型参考](#6-第三方服务选型参考)

---

## 1. 框架架构概览

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 15 (App Router) + React 19 |
| API 层 | tRPC 11（类型安全的端到端 API） |
| 数据库 ORM | Prisma 6 + PostgreSQL |
| 缓存 / 队列 | Redis + BullMQ |
| 认证 | NextAuth v5（支持 OAuth + 邮箱） |
| 样式 | Tailwind CSS v4 |
| 包管理 | pnpm |

### 分层架构

```mermaid
graph TB
  subgraph client [客户端层]
    pages[Next.js 页面 / App Router]
    ui[UI 组件库]
    trpcClient[tRPC 客户端]
  end

  subgraph api [API 层]
    trpcServer[tRPC Server / Routers]
    webhooks[Webhook 处理器]
    authApi[NextAuth 端点]
  end

  subgraph infra [基础设施层 — 框架提供，一般不动]
    authCore[认证系统 NextAuth]
    db[Prisma + PostgreSQL]
    redis[Redis 客户端]
    queue[BullMQ 队列]
    storage[对象存储抽象]
    email[邮件服务抽象]
    ratelimit[限流]
    adminFrame[Admin 框架]
  end

  subgraph business [业务层 — 按产品定制]
    product[产品 / 定价定义]
    aiFeature[核心 AI 功能模块]
    billing[计费与积分]
    payment[支付渠道集成]
    touch[用户触达 / 生命周期]
    support[客服集成]
    affiliate[联盟推广]
  end

  subgraph workers [Worker 进程 — 独立部署]
    jobProcessors[BullMQ Processors]
    scheduledJobs[定时任务]
  end

  client --> api
  api --> infra
  api --> business
  business --> infra
  workers --> infra
  workers --> business
```

### 请求数据流

```mermaid
sequenceDiagram
  participant Browser
  participant NextJS
  participant tRPC
  participant Service
  participant DB
  participant Redis

  Browser->>NextJS: HTTP 请求
  NextJS->>tRPC: 路由到对应 procedure
  tRPC->>tRPC: 认证鉴权 + 限流检查
  tRPC->>Service: 调用业务 Service
  Service->>DB: Prisma 查询
  Service->>Redis: 缓存 / 队列操作
  Service-->>tRPC: 返回结果
  tRPC-->>Browser: 类型安全响应
```

---

## 2. 最小配置快速启动

### 必需环境变量

以下是让框架**最小化启动**所必须配置的变量（其余均为可选）：

```bash
# 认证
AUTH_SECRET=         # 运行 `npx auth secret` 生成
AUTH_URL=http://localhost:3000

# 数据库
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/mydb

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# 至少配置一个 OAuth 登录方式（可选其一）
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
# 或
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### 本地启动步骤

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量模板
cp .env.example .env
# 编辑 .env，填入上方必需变量

# 3. 初始化数据库
pnpm db:migrate      # 执行迁移
pnpm db:seed         # 可选：初始化种子数据

# 4. 启动开发服务器
pnpm dev             # 主应用 http://localhost:3000

# 5. 启动 Worker（新终端，需要 Redis）
pnpm worker:dev
```

### 可选但推荐提前配置

| 功能 | 变量 |
|------|------|
| 文件上传 | `STORAGE_*` + `CDN_BASE_URL` |
| 发送邮件 | `RESEND_API_KEY` 或 `SENDGRID_API_KEY` |
| 分析统计 | `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` |
| 防机器人 | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` |

---

## 3. 框架 vs 业务 — 代码边界清单

### 框架层（不需要修改，直接复用）

这些模块是通用基础设施，切换产品时不需要动：

| 路径 | 说明 |
|------|------|
| `src/env.js` | 环境变量 Schema 统一入口（Zod 校验） |
| `src/server/db.ts` | Prisma Client 单例 |
| `src/server/redis.ts` | Redis 客户端单例（ioredis） |
| `src/server/ratelimit.ts` | 基于 Redis 的请求限流 |
| `src/server/auth/config.ts` | NextAuth 配置（按需增减 provider） |
| `src/server/email/` | 邮件发送抽象（Resend / SendGrid 自动切换） |
| `src/server/api/trpc.ts` | tRPC 中间件（认证、限流） |
| `src/server/order/` | 订单状态机（通用，不与产品耦合） |
| `src/workers/index.ts` | Worker 进程入口与调度框架 |
| `src/app/api/auth/` | NextAuth 路由 |
| `src/app/api/trpc/` | tRPC HTTP 处理器 |
| `src/app/auth/` | 登录 / 被封禁页面 |
| `src/components/ui/` | 基础 UI 组件（shadcn/ui 风格） |
| `src/components/auth/` | 登录相关组件 |
| `src/components/layout/` | 全局布局组件 |
| `deploy/base/` | 通用 K8s 配置模板 |

### 框架 + 配置层（复用框架，替换配置/场景）

这些模块的**引擎**是通用的，但需要根据产品填入具体配置：

| 路径 | 需要定制的部分 |
|------|--------------|
| `src/server/billing/config/` | 积分包定义、消耗规则、订阅档位 |
| `src/server/touch/config/` | 触达场景（欢迎邮件、续费提醒等）的文案和触发条件 |
| `src/server/support/` | 客服邮件账号、飞书/Lark 群配置 |
| `src/server/telegram/` | Telegram Bot 配置与命令 |
| `prisma/schema.prisma` | 保留核心表（User、Order、BillingAccount 等），删除/替换业务相关表 |
| `src/app/admin/` | 保留通用管理页，删除业务特定视图（如 `works/`、`touches/scenes/`） |

### 业务层（完全替换为新产品逻辑）

这些模块与当前产品（AI 视频生成）强绑定，新产品需全部替换：

| 路径 | 性质 | 替换说明 |
|------|------|---------|
| `src/server/video-generation/` | 业务 | 替换为你的核心 AI 功能 Service |
| `src/server/product/` | 业务 | 重新定义产品 SKU、定价结构 |
| `src/workers/processors/video-generation/` | 业务 | 替换为你的异步 AI 任务 Processor |
| `src/workers/processors/video-generation-reconciliation/` | 业务 | 替换为你的任务对账逻辑 |
| `src/app/(feature)/` | 业务 | 替换为你的核心功能前端页面 |
| `src/components/video-gen/` | 业务 | 替换为你的核心功能 UI 组件 |
| `src/app/pricing/` | 业务 | 基于新产品定价重写 |
| `src/app/page.tsx` | 业务 | 首页完全替换 |

### Prisma Schema 边界

```
保留（框架通用表）          替换（业务专用表）
─────────────────────    ──────────────────────────
User                      VideoTask
Account / Session         VideoOutput
BillingAccount            VideoExtendTask
BillingTransaction        （你的业务 Model）
Order / OrderItem
Membership / MembershipCycle
PromoCode / PromoUsage
AffiliateAccount
UserNotificationPreference
Touch / TouchLog
SupportTicket
```

---

## 4. 从框架到生产应用 — 分阶段 Checklist

### 阶段一：基础运行

> 目标：能在本地 `pnpm dev` 跑起来，可以注册登录

- [ ] 配置 `DATABASE_URL` 并运行 `pnpm db:migrate`
- [ ] 配置 `REDIS_HOST` + `REDIS_PORT`
- [ ] 生成并配置 `AUTH_SECRET`（`npx auth secret`）
- [ ] 配置至少一个 OAuth 登录（Google / GitHub / Discord）
- [ ] 在对应平台创建 OAuth App，填入 callback URL：`http://localhost:3000/api/auth/callback/<provider>`
- [ ] 确认 `pnpm dev` 可以正常启动，访问 `/auth/signin` 可以登录

### 阶段二：存储与邮件

> 目标：用户可以上传文件，系统可以发送邮件

- [ ] 选择并配置对象存储（推荐 Cloudflare R2，最便宜）
  - 配置 `STORAGE_PROVIDER` / `STORAGE_BUCKET` / `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` / `STORAGE_ENDPOINT`
- [ ] 配置 `CDN_BASE_URL`（用于公开访问存储文件）
- [ ] 配置邮件服务（`RESEND_API_KEY` 或 `SENDGRID_API_KEY`），设置 `EMAIL_PROVIDER`
- [ ] 验证域名 SPF / DKIM / DMARC（防止邮件进垃圾箱）
- [ ] 发送测试邮件确认配置正常

### 阶段三：定义产品与定价

> 目标：明确卖什么、卖多少钱，完成产品配置

- [ ] 确定产品模型：一次性购买 / 订阅 / 积分包，或混合
- [ ] 在 `src/server/product/` 中定义产品 SKU（ID、名称、积分量、价格）
- [ ] 在 `prisma/schema.prisma` 中删除视频相关 Model，添加你的业务 Model
- [ ] 运行 `pnpm db:migrate` 应用 Schema 变更
- [ ] 在 `src/server/billing/config/` 中配置积分规则（购买包含多少积分、每次操作消耗多少）
- [ ] 更新前端定价页 `src/app/pricing/page.tsx`

### 阶段四：实现核心 AI 功能

> 目标：替换视频生成逻辑，实现你的核心 AI 功能

- [ ] 在 `src/server/` 下新建你的功能 Service 目录（参考 `src/server/video-generation/` 结构）
- [ ] 实现核心功能的 tRPC router，挂载到 `src/server/api/root.ts`
- [ ] 如果功能是异步的，在 `src/workers/processors/` 下新建 Processor
- [ ] 实现 Worker Processor 的业务逻辑（调用 AI API → 存储结果 → 更新任务状态）
- [ ] 删除或保留 `src/server/video-generation/`（建议保留作为参考，最终删除）
- [ ] 构建前端 UI 页面（`src/app/<your-feature>/`）
- [ ] 替换 `src/app/page.tsx` 首页内容

### 阶段五：支付集成

> 目标：完整的购买 → 积分发放 → 使用扣减链路可用

- [ ] 选择支付渠道：
  - 国际用户为主 → Stripe（推荐首选）
  - 中国大陆用户 → Airwallex
  - 加密货币 → NowPayments
  - Telegram 用户 → Telegram Stars
- [ ] 在 Stripe / Airwallex 后台创建与代码中 SKU 对应的产品和价格
- [ ] 配置支付相关 env（`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET` 等）
- [ ] 在支付平台后台配置 Webhook，指向 `/api/webhooks/<provider>`
- [ ] 测试完整流程：选择产品 → 发起支付 → Webhook 回调 → 积分到账
- [ ] 测试退款流程：发起退款 → 积分扣除
- [ ] 测试订阅续费（如果有订阅产品）

### 阶段六：用户生命周期触达

> 目标：关键节点自动触达用户（欢迎邮件、续费提醒、激活召回等）

- [ ] 在 `src/server/touch/config/` 中配置触达场景，常见场景：
  - 注册后欢迎邮件（`onboard`）
  - 积分即将耗尽提醒（`credits_low`）
  - 订阅到期前 N 天提醒（`renewal_reminder`）
  - 长期未活跃召回（`re_engagement`）
- [ ] 编写对应的邮件模板（`src/server/email/templates/`，使用 React Email）
- [ ] 在 Worker 中配置定时任务调度频率
- [ ] 测试各触达场景是否正常触发和发送

### 阶段七：运营后台与通知

> 目标：内部运营可以通过 Admin 面板管理用户和订单

- [ ] 配置 Admin 后台访问权限（`src/server/admin/`，通常基于邮箱白名单或 role）
- [ ] 删除与旧产品相关的 Admin 页面（如 `src/app/admin/works/`）
- [ ] 根据新产品添加必要的 Admin 视图（用户、订单、积分操作）
- [ ] 配置运营通知渠道（选一个）：
  - Lark / 飞书：配置 `LARK_APP_ID` / `LARK_APP_SECRET` 等
  - Telegram：配置 `TELEGRAM_BOT_TOKEN`
  - （可选）替换为 Slack / Discord Webhook
- [ ] 集成 PostHog 分析（`NEXT_PUBLIC_POSTHOG_KEY`），验证关键埋点事件
- [ ] 配置 Cloudflare Turnstile 防机器人（`TURNSTILE_*`）

### 阶段八：生产部署

> 目标：在生产环境稳定运行

- [ ] 构建 Docker 镜像（`next build` 后产物在 `.next/standalone/`）
  - 参考 `deploy/wan2.1-docker/Dockerfile` 结构
  - 替换镜像仓库地址（`deploy/base/deployment.yaml`）
- [ ] 配置 K8s（参考 `deploy/base/`）：
  - 在 `deploy/base/ingress.yaml` 中替换域名
  - 根据流量设置副本数
  - Web 服务与 Worker 服务分别部署
- [ ] 配置生产级数据库：
  - 设置定期备份（推荐每日）
  - 考虑只读副本用于分析查询
- [ ] 配置 Redis：
  - 生产环境建议使用托管 Redis（如阿里云、Upstash）
  - 设置持久化策略（AOF + RDB）
- [ ] 配置 SSL 证书（cert-manager + Let's Encrypt）
- [ ] 配置 CI/CD（GitHub Actions）：
  - `main` 分支 push → 构建镜像 → 推送到镜像仓库 → 触发 K8s rolling update
- [ ] 设置日志收集（推荐 Loki + Grafana 或直接用云厂商日志服务）
- [ ] 配置健康检查告警（Worker 的 `/health` 和 `/ready` 端点已内置）

### 阶段九：安全加固

> 目标：符合基本生产安全标准

- [ ] 确认生产 `AUTH_SECRET` 是随机生成的强密钥（不要用开发环境的值）
- [ ] 开发 key 与生产 key 完全分离（不同 Stripe account / OAuth app）
- [ ] 审查 `src/server/ratelimit.ts`，为敏感接口（登录、支付、AI 调用）设置合理限速
- [ ] 配置 CSP（Content Security Policy）头，防 XSS
- [ ] 确认 Admin 路由只有内部账号可以访问（不依赖"别人不知道路径"）
- [ ] Webhook 端点均验证签名（`stripe-signature`、`airwallex-signature` 等）
- [ ] 数据库连接使用 SSL（`DATABASE_URL` 加 `?sslmode=require`）
- [ ] 定期轮换 API Key（尤其是支付类）

---

## 5. 关键架构决策说明

### 积分模型

所有 AI 功能消耗以**积分（Credits）**为单位，与产品定价解耦：

```
用户购买产品 → 获得积分 → 每次 AI 操作消耗积分 → 积分耗尽需要补充
```

- 积分余额记录在 `BillingAccount.credits`
- 每次消耗通过 `BillingTransaction` 记账（可追溯）
- 好处：更换定价方案时只需修改积分包配置，不影响消耗逻辑

### 支付网关自动路由

系统根据用户 IP 地理位置自动选择支付渠道：

```
用户 IP → 地理位置判断 → 选择最优支付渠道
  中国大陆 → Airwallex
  其他地区 → Stripe
  用户明确选择加密 → NowPayments
  Telegram 内 → Telegram Stars
```

开发测试时可用 `FORCE_PAYMENT_GATEWAY` 环境变量强制指定渠道（绕过地理检测）。

### Worker 与主服务分离

```
主服务（Next.js）   ──── 写入队列 ────▶   Worker 进程（BullMQ）
  处理 HTTP 请求                              消费队列任务
  响应用户操作                                调用 AI API（可能耗时长）
  不阻塞等待 AI 结果                           写入结果到数据库
                                             通知用户（WebSocket / 推送）
```

- Worker 独立部署，可单独扩缩容
- AI 任务失败自动重试（BullMQ 内置）
- Worker 挂掉不影响主服务响应用户

### 多环境行为差异

通过 `NEXT_PUBLIC_APP_ENV` 控制：

| 变量值 | 环境 | 典型差异 |
|--------|------|---------|
| `dev` | 本地开发 | 关闭部分限流，详细错误信息 |
| `staging` | 测试环境 | 使用测试支付 key，不发真实邮件 |
| `prod` | 生产环境 | 全部限流开启，使用真实支付 |

### tRPC 类型安全

tRPC 确保前后端类型自动同步，新增 API 步骤：

```
1. 在 src/server/api/routers/<feature>.ts 中定义 procedure
2. 在 src/server/api/root.ts 中挂载 router
3. 前端直接调用 api.<feature>.<procedure>.useQuery() / useMutation()
   —— TypeScript 自动推断入参和返回值类型，无需手写类型
```

---

## 6. 第三方服务选型参考

### AI Provider 选择

| Provider | 适合场景 | 配置变量 |
|----------|---------|---------|
| Anthropic Claude | 长文本理解、代码、复杂推理 | `ANTHROPIC_API_KEY` |
| OpenAI GPT | 通用场景，生态最成熟 | `OPENAI_API_KEY` |
| OpenRouter | 统一入口路由多家模型，按需切换 | `OPENROUTER_API_KEY` |
| xAI Grok | 实时信息理解 | `XAI_API_KEY` |
| Google Gemini | 多模态（图片/视频理解） | `GEMINI_API_KEY` |
| 火山引擎 Ark | 国内合规，字节系模型 | `VOLCENGINE_API_KEY` |

### 对象存储选择

| Provider | 推荐场景 | 配置 `STORAGE_PROVIDER` |
|----------|---------|----------------------|
| Cloudflare R2 | 出口流量免费，推荐首选 | `r2` |
| AWS S3 | 生态最全，有成熟工具链 | `aws` |
| 阿里云 OSS | 国内合规，访问速度快 | `aliyun` |
| Google Cloud Storage | GCP 用户 | `gcs` |
| MinIO | 私有化部署 | `minio` |

### 支付渠道选择

| Provider | 适用用户群 | 配置 |
|----------|----------|------|
| Stripe | 国际用户（美元/欧元） | `STRIPE_*` |
| Airwallex | 亚太区用户 / 需要人民币结算 | `AIRWALLEX_*` |
| NowPayments | 加密货币用户 | `NOWPAYMENTS_*` |
| Telegram Stars | Telegram 用户 | `TELEGRAM_BOT_TOKEN` |

### 通知渠道选择

| 渠道 | 适用场景 | 配置 |
|------|---------|------|
| Lark（国际飞书） | 团队已在用 Lark | `LARK_APP_*` |
| 飞书（国内） | 国内团队 | `FEISHU_APP_*` |
| Telegram Bot | 技术向团队 | `TELEGRAM_BOT_TOKEN` |
| Resend | 邮件通知 | `RESEND_API_KEY` |
