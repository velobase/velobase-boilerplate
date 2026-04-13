# 分析（Analytics）— PostHog

## 选型


| 服务          | 角色     | 说明                               |
| ----------- | ------ | -------------------------------- |
| **PostHog** | 唯一分析平台 | 事件追踪 + Feature Flag + Web Vitals |


选择理由：开源、自托管可选、Event + Feature Flag 统一平台、SDK 同时覆盖客户端和 Node 服务端。

框架中 Twitter 转化追踪（`src/analytics/twitter.ts`）和 Google Ads 转化（`src/config/analytics.ts`）属于广告转化追踪，不属于 PostHog 集成范畴，归入 Ads 集成。

---

## 架构

```
┌─────────────────────────────────────────────────────────┐
│  客户端（posthog-js）                                    │
│                                                         │
│  PostHogProvider ──► posthog.init() ──► posthog.identify │
│       │                                                 │
│  track()        ──► posthog.capture()                   │
│  setUserProperties() ──► posthog.people.set()           │
│  resetUser()    ──► posthog.reset()                     │
│  useFeatureFlagVariantKey()  ──► 客户端 Flag 读取        │
├─────────────────────────────────────────────────────────┤
│  服务端（posthog-node）                                  │
│                                                         │
│  getServerPostHog() ──► new PostHog(apiKey)              │
│  safeTrack()        ──► capture + shutdown (try/catch)   │
│  getFeatureFlag()   ──► posthog.getFeatureFlag()        │
└─────────────────────────────────────────────────────────┘
```

### 代码位置

```
src/analytics/
├── posthog-provider.tsx   # 客户端 Provider（init + identify）
├── track.ts               # 客户端 track / setUserProperties / resetUser
├── server.ts              # 服务端 getServerPostHog / safeTrack
├── index.ts               # 客户端统一导出（纯 PostHog）
├── ads/                   # 广告转化追踪（非 PostHog，归入 Ads 集成）
│   ├── twitter.ts         # Twitter Ads 转化
│   ├── google.ts          # Google Ads 转化配置
│   └── index.ts           # 统一导出
└── events/                # 事件名常量 + 类型
    ├── index.ts           # 聚合导出 EVENTS
    ├── auth.ts            # AUTH_EVENTS
    ├── billing.ts         # BILLING_EVENTS
    └── navigation.ts      # NAVIGATION_EVENTS

src/server/experiments/
├── get-feature-flag.ts    # 服务端 Feature Flag 封装
└── index.ts               # 导出
```

### 数据流

**客户端事件**：组件 → `track(EVENT, props)` → `posthog.capture()` → PostHog Cloud

**服务端事件**：Server → `getServerPostHog()` → `posthog.capture({...})` → `posthog.shutdown()` → PostHog Cloud

**用户身份**：

1. 登录后 `PostHogProvider` 自动 `posthog.identify(userId)`
2. 服务端在 `auth/config.ts` 中 `posthog.alias({ distinctId: userId, alias: email })`
3. 登出时 `resetUser()` → `posthog.reset()` 断开匿名 ID 与用户的关联

**Feature Flag**：

- 客户端：`useFeatureFlagVariantKey("flag-key")` （`posthog-js/react` hook）
- 服务端：`getFeatureFlag(flagKey, { distinctId }, defaultValue)`

---

## 对外接口

### 客户端 API（从 `@/analytics` 导入）

```typescript
// 事件追踪
function track(event: string, properties?: Record<string, unknown>): void;

// 用户属性
function setUserProperties(properties: Record<string, unknown>): void;

// 登出时重置（断开匿名 ID 关联）
function resetUser(): void;
```

### 服务端 API（从 `@/analytics/server` 导入）

```typescript
// 获取 PostHog Node 客户端实例（无 key 返回 null）
function getServerPostHog(): PostHog | null;

// 安全上报（try/catch，不阻塞业务）
async function safeTrack(
  event: string,
  distinctId: string,
  properties?: Record<string, unknown>
): Promise<void>;
```

### Feature Flag（从 `@/server/experiments` 导入）

```typescript
// 服务端获取 flag 值，内置错误处理和降级
async function getFeatureFlag<T extends string>(
  flagKey: string,
  options: { distinctId: string; personProperties?: Record<string, string | undefined> },
  defaultValue: T
): Promise<T>;
```

### 客户端 Feature Flag（从 `posthog-js/react` 导入）

```typescript
import { useFeatureFlagVariantKey } from "posthog-js/react";
const variant = useFeatureFlagVariantKey("flag-key");
```

### 事件常量（从 `@/analytics/events` 导入）


| 常量                  | 事件数  | 范围    |
| ------------------- | ---- | ----- |
| `AUTH_EVENTS`       | 9 个  | 认证漏斗  |
| `BILLING_EVENTS`    | 10 个 | 支付与积分 |
| `NAVIGATION_EVENTS` | 2 个  | 移动端导航 |


每组事件都有对应的 `Properties` interface 定义属性类型。

---

## 配置

### 环境变量

```bash
# 客户端 PostHog（必填 — 客户端+服务端共用 project key）
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# 服务端 PostHog（可选 — 若设置则服务端优先使用此 key）
# 适用于需要区分客户端/服务端 project 的场景
POSTHOG_API_KEY=
```

### 获取密钥

1. 注册 [PostHog](https://posthog.com)（免费版每月 100 万事件）
2. Project Settings → Project API Key → 填入 `NEXT_PUBLIC_POSTHOG_KEY`
3. `NEXT_PUBLIC_POSTHOG_HOST` 默认 `https://us.i.posthog.com`（US Cloud）或 `https://eu.i.posthog.com`（EU Cloud）

### GDPR 合规

框架内置 EEA 地区 Cookie 同意门控：

- `PostHogProvider` 接收 `analyticsEnabled` prop
- 在 EEA 地区，仅当用户明确同意 Cookie 时才初始化 PostHog
- 双重保险：Provider 内部再次检查 `data-eea` + `app_cookie_consent` cookie

### 构建配置

`next.config.js` 已将 `posthog-node` 加入 `serverExternalPackages`，避免打入浏览器包。

---

## 异常处理

### 策略：静默降级，不阻塞业务


| 场景                            | 处理                                             |
| ----------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_POSTHOG_KEY` 未设置 | 客户端不初始化；服务端 `getServerPostHog()` 返回 `null`     |
| PostHog API 不可达               | 客户端 SDK 内置重试队列；服务端 `safeTrack` catch 后静默       |
| Feature Flag 获取失败             | `getFeatureFlag()` 返回 `defaultValue`，日志 `warn` |
| EEA 用户未同意 Cookie              | PostHog 不初始化，所有 `track()` 调用是 no-op            |


### 服务端使用规则

```typescript
// ✅ 正确：每次请求创建新实例并 shutdown
const posthog = getServerPostHog();
if (posthog) {
  posthog.capture({ distinctId: userId, event: "xxx", properties: {...} });
  await posthog.shutdown();
}

// ✅ 更简单：使用 safeTrack
await safeTrack("event_name", userId, { key: "value" });

// ❌ 错误：服务端调用客户端 track()（posthog-js 在 Node 中无效）
import { track } from "@/analytics";  // 这是客户端 API
track("event");  // Node 环境下不工作
```

---

## AI 引导

### 硬规则

1. **客户端** → `import { track } from "@/analytics"`
2. **服务端**（tRPC / API Route / Worker）→ `import { safeTrack } from "@/analytics/server"` 或 `getServerPostHog()`
3. **绝不在服务端代码中导入 `@/analytics`**（只能导入 `@/analytics/server` 和 `@/analytics/events/*`）
4. 新事件 → 先在 `src/analytics/events/` 中定义常量和 Properties interface，再使用
5. 事件命名规范：`{domain}_{action}`，如 `auth_login_success`、`billing_credits_purchase_success`
6. Feature Flag 客户端用 `useFeatureFlagVariantKey()`，服务端用 `getFeatureFlag()`

### 新增事件模板

```typescript
// 1. 在 src/analytics/events/ 中新建或追加

export const MY_EVENTS = {
  ACTION_DONE: "my_domain_action_done",
} as const;

export interface MyEventProperties {
  [MY_EVENTS.ACTION_DONE]: {
    item_id: string;
    duration_ms: number;
  };
}

// 2. 在 src/analytics/events/index.ts 中聚合导出
export * from "./my-events";
import { MY_EVENTS } from "./my-events";
export const EVENTS = { ...AUTH_EVENTS, ...BILLING_EVENTS, ...NAVIGATION_EVENTS, ...MY_EVENTS };

// 3. 客户端使用
track(MY_EVENTS.ACTION_DONE, { item_id: "123", duration_ms: 450 });

// 4. 服务端使用
await safeTrack(MY_EVENTS.ACTION_DONE, userId, { item_id: "123", duration_ms: 450 });
```

### 新增 Feature Flag 模板

```typescript
// 客户端（React 组件内）
import { useFeatureFlagVariantKey } from "posthog-js/react";
const variant = useFeatureFlagVariantKey("my-experiment");

// 服务端
import { getFeatureFlag } from "@/server/experiments";
const variant = await getFeatureFlag("my-experiment", { distinctId: userId }, "control");
```

### 常见错误预防


| 错误                  | 预防                                              |
| ------------------- | ----------------------------------------------- |
| 服务端导入 `@/analytics` | `server.ts` 有 `import "server-only"` 标记，混用会构建报错 |
| 事件名拼写错误             | 用常量 `EVENTS.XXX` 而非字符串字面量                       |
| 服务端忘记 `shutdown()`  | 使用 `safeTrack()` 自动处理                           |
| 服务端忘记传 `distinctId` | `safeTrack` 签名强制要求                              |


