# 注册反滥用（Anti-Abuse Guard）

## 功能说明

检测新用户注册中的白嫖、多号、脚本攻击等滥用行为，并在确认后自动回收已发放的积分。

本功能包含两个守卫，分别作用于注册流程的不同阶段：


| 守卫               | 触发时机        | 作用                                       |
| ---------------- | ----------- | ---------------------------------------- |
| **Email Guard**  | 发送魔法链接前（同步） | 拦截临时邮箱、Gmail tricks、已封禁用户、Turnstile 人机验证 |
| **Signup Guard** | 注册发放积分后（异步） | 检测同 IP/同设备多号，确认滥用后回收积分                   |


### 为什么分两阶段？

- **Email Guard** 是"门前拦截"，在验证邮件发出前就阻止明显恶意请求，节省邮件成本
- **Signup Guard** 是"事后追溯"，对已完成注册的用户做更深度的行为分析，避免影响正常注册体验

### 处置方式

采用"先发后收"模式：

1. 注册时 **全额发放** 初始积分（保证正常用户零延迟体验）
2. 异步执行滥用检测
3. 确认滥用 → 通过 Velobase `deduct` **回收全部可用积分**
4. 非滥用 → 积分保持不动

## 依赖

- **Velobase Billing** — `getBalance()` 查余额、`postConsume()` 回收积分
- **Auth** — 需要用户已登录，依赖 `User` 表的 `signupIp`、`deviceKeyAtSignup`、`isPrimaryDeviceAccount` 字段
- **DB (Prisma)** — 查询同 IP 历史注册记录
- **Cloudflare Turnstile**（可选） — Email Guard 的人机验证层

## 代码位置

```
src/server/features/anti-abuse/
├── signup-guard.ts   # 注册后滥用检测 + 积分回收（策略常量 + 检测维度 + 处置函数）
├── email-guard.ts    # 邮箱验证前拦截（临时邮箱 / Gmail tricks / Turnstile）
└── index.ts          # 导出
```

## 启用/禁用

不需要配置开关。需要时在对应位置调用，不需要时不调用即可。

### Email Guard — 在 magic link 发送前调用

```typescript
import { guardEmail } from '@/server/features/anti-abuse'

// 抛出 Error 则阻止发送，message 格式: "CODE:人类可读描述"
await guardEmail(email, clientIp)
```

### Signup Guard — 在注册发放积分后异步调用

```typescript
import { checkSignupAbuse, enforceSignupAbuse } from '@/server/features/anti-abuse'

// 方式 1：纯检测（不执行回收），用于预判
const result = await checkSignupAbuse({ userId, email, signupIp })
// result: { isAbuse: boolean, reason?: string, existingEmails?: string[] }

// 方式 2：检测 + 回收（fire-and-forget）
void enforceSignupAbuse(userId, email, signupIp)

// 方式 3：先检测再决定是否回收（如需在发放前预判）
const decision = await checkSignupAbuse({ userId, email, signupIp })
if (decision.isAbuse) {
  void enforceSignupAbuse(userId, email, signupIp, decision)
}
```

## AI 修改指南

### 1. Signup Guard 策略常量（`signup-guard.ts` 顶部）

修改这些常量来调整检测灵敏度：

```typescript
const SAME_IP_WINDOW_HOURS = 24           // 时间窗口大小（小时）
const SAME_IP_MIN_PRIOR_DIFFERENT_DEVICE = 1  // 同 IP 不同设备：几个先行账号算滥用
const SAME_IP_MIN_PRIOR_UNKNOWN_DEVICE = 1    // 同 IP 未知设备：几个先行账号算滥用
const SAME_IP_MAX_TOTAL_HISTORY = 20          // 同 IP 历史总量上限
```

**示例场景调整：**

- 「公司/学校 WiFi 误伤太多」→ 调大 `SAME_IP_MIN_PRIOR_DIFFERENT_DEVICE` 到 3~5
- 「代理 IP 防御加强」→ 调小 `SAME_IP_MAX_TOTAL_HISTORY` 到 10
- 「只看最近 1 小时的高频注册」→ 改 `SAME_IP_WINDOW_HOURS = 1`

### 2. Email Guard 策略常量（`email-guard.ts` 顶部）

```typescript
const GMAIL_MAX_DOTS = 1              // Gmail local part 允许的最大 "." 数量
const EMAIL_MAX_LOCAL_LENGTH = 30     // 邮箱 local part 最大长度
const TURNSTILE_ENABLED = true        // 是否启用 Turnstile 人机验证
```

**示例场景调整：**

- 「允许 [first.last.name@gmail.com](mailto:first.last.name@gmail.com)」→ 改 `GMAIL_MAX_DOTS = 2`
- 「不使用 Turnstile」→ 改 `TURNSTILE_ENABLED = false`

### 3. 添加新的检测维度

在 `signup-guard.ts` 的 `checkSignupAbuse` 函数中，按现有的"维度"注释模式添加。每个维度是一个独立的 `if` 块：

```typescript
// ── 维度 N：你的新规则 ──
if (yourCondition) {
  logger.warn({ userId, email, signupIp }, 'Your reason')
  return { isAbuse: true, reason: 'YOUR_REASON_CODE' }
}
```

### 4. 添加新的 Email Guard 检测层

在 `email-guard.ts` 的 `guardEmail` 函数中，按现有的"层"注释模式添加：

```typescript
// ── 层 N：你的新检查 ──
if (yourCondition) {
  throw new Error('YOUR_CODE:Human readable message.')
}
```

### 5. 不需要修改的部分

- `enforceSignupAbuse()` — 回收编排逻辑，一般不需要动
- `index.ts` — 除非新增导出

