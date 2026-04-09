# 邮件（Email）集成文档

> 第三方集成梳理 · 第 3 站 · ✅ 已完成

## 1. 选型

### 支持的邮件服务


| 服务       | 用途                   | 状态    |
| -------- | -------------------- | ----- |
| Resend   | 主力发信（API + React 模板） | ✅ 已接入 |
| SendGrid | 备选发信（API + HTML 模板）  | ✅ 已接入 |


### 选型理由

- **Resend**：开发者体验最好，支持 React 组件作为邮件模板，免费额度对个人开发者够用（100 封/天）。
- **SendGrid**：成熟稳定，免费额度更高（100 封/天），作为 Resend 的 fallback。

### 共存关系

两者通过 `EMAIL_PROVIDER` 环境变量控制优先级链（逗号分隔，顺序即优先级）：

- `resend` → 仅用 Resend
- `sendgrid` → 仅用 SendGrid
- `resend,sendgrid`（默认）→ Resend 优先，失败 fallback 到 SendGrid
- `sendgrid,resend` → SendGrid 优先，失败 fallback 到 Resend

### 邮件使用场景


| 场景            | 说明              | 调用方式                                                 |
| ------------- | --------------- | ---------------------------------------------------- |
| 认证 Magic Link | 登录/注册时发送一次性登录链接 | `sendEmail()` from `@/server/email`                  |
| 触达通知          | 订阅提醒、营销邮件等      | `sendEmail()` from `@/server/email`                  |
| 客服回复          | 回复用户支持邮件（SMTP）  | `sendEmail()` from `@/server/support/providers/smtp` |


## 2. 架构设计

### 最终架构

```
src/server/email/
├── index.ts                   # 统一入口：sendEmail()（含 provider 链 + fallback）
├── types.ts                   # SendEmailParams, SendEmailResult, EmailProvider
├── providers/
│   ├── index.ts               # Provider 注册中心 + resolveProviderChain()
│   ├── resend.ts              # Resend provider 实现
│   └── sendgrid.ts            # SendGrid provider 实现
└── templates/
    └── magic-link.tsx         # Magic Link 模板（React 版 + HTML 字符串版）
```

### 核心设计：可配置 Provider 链

`EMAIL_PROVIDER` 环境变量支持逗号分隔的 provider 名称列表，顺序即为优先级：

```
EMAIL_PROVIDER=resend,sendgrid   → [resend, sendgrid]
EMAIL_PROVIDER=sendgrid,resend   → [sendgrid, resend]
EMAIL_PROVIDER=resend            → [resend]
```

`resolveProviderChain()` 解析此配置，过滤出已配置 API Key 的 provider，生成有序链。
`sendEmail()` 按链顺序逐个尝试，失败自动 fallback 到下一个。

### 数据流

```
业务代码
    │
    ├── auth config ──→ sendEmail({ react, html, ... })
    ├── touch service ──→ sendEmail({ subject, html, ... })
    └── (客服 SMTP 独立)
                              │
                              ▼
                     sendEmail()（src/server/email/index.ts）
                     解析 EMAIL_PROVIDER → provider 链
                              │
                    按优先级逐个尝试，失败 fallback
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
                  Resend             SendGrid
              （或反过来，取决于配置）
```

## 3. 接口定义

### 统一发信接口

```typescript
interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  react?: React.ReactElement;  // Resend 专属
  from?: string;               // 可选，默认从 EMAIL_FROM 环境变量读取
  replyTo?: string;
}

interface SendEmailResult {
  provider: string;
  messageId: string;
}

// 通用发信
function sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
```

### EmailProvider 接口（新增 provider 时实现）

```typescript
interface EmailProvider {
  name: string;
  send(params: SendEmailParams): Promise<SendEmailResult>;
  isAvailable(): boolean;  // 检查 API Key 是否配置
}
```

### 功能边界

**邮件模块做的事：**

- 发送邮件（文本、HTML、React 模板）
- Provider 选择、优先级链和自动 fallback
- 错误处理和日志

**邮件模块不做的事：**

- 邮件模板内容设计（由各业务模块定义）
- 发送频率控制（由调用方负责）
- 收件（IMAP，属于 support 模块）

## 4. 配置

### 环境变量


| 变量                 | 必填    | 说明                              | 获取方式                                                    |
| ------------------ | ----- | ------------------------------- | ------------------------------------------------------- |
| `RESEND_API_KEY`   | 至少配一个 | Resend API Key                  | [Resend Dashboard](https://resend.com/) → API Keys      |
| `SENDGRID_API_KEY` | 至少配一个 | SendGrid API Key                | [SendGrid](https://sendgrid.com/) → Settings → API Keys |
| `EMAIL_PROVIDER`   | 否     | 逗号分隔的优先级链（默认 `resend,sendgrid`） | 手动设置                                                    |
| `EMAIL_FROM`       | 否     | 默认发件人地址                         | 如 `App <noreply@yourdomain.com>`                        |


### 第三方平台配置

#### Resend

1. 注册 [Resend](https://resend.com/)
2. Domains → Add Domain → 添加你的发件域名
3. 按提示配置 DNS 记录（MX, SPF, DKIM）
4. API Keys → Create API Key → 复制到 `RESEND_API_KEY`

#### SendGrid

1. 注册 [SendGrid](https://sendgrid.com/)
2. Settings → Sender Authentication → 验证域名
3. Settings → API Keys → Create API Key（Full Access 或 Mail Send 权限）
4. 复制到 `SENDGRID_API_KEY`

## 5. 异常处理


| 场景                    | 处理方式                                                |
| --------------------- | --------------------------------------------------- |
| 所有 API Key 未配置        | 启动时 warn 日志，运行时抛 `No email providers configured`    |
| 单个 provider 缺 API Key | 自动跳过，不加入 provider 链                                 |
| Provider 链中某个失败       | 记录 warn 日志，自动尝试链中下一个                                |
| 所有 Provider 都失败       | 抛出 `All email providers failed`，附带每个 provider 的错误信息 |
| 未知 provider 名称        | 启动时抛出 `Unknown email provider "xxx"`                |


## 6. AI 引导

### 已写入 AGENTS.md 的规则

- 发送邮件统一使用 `sendEmail()` from `@/server/email`
- 不要直接调用 Resend SDK 或 SendGrid SDK
- 同时提供 `react` 和 `html` 参数以确保所有 provider 兼容
- 新增 provider 需实现 `EmailProvider` 接口并在 `providers/index.ts` 注册
- 邮件模板放在 `src/server/email/templates/`，同时提供 React 和 HTML 版本
- Support 模块的 SMTP 是独立通道，不走 `sendEmail()`

### 新增 Provider 步骤

1. 在 `src/server/email/providers/` 创建 `<name>.ts`，实现 `EmailProvider` 接口
2. 在 `providers/index.ts` 的 `providerRegistry` 中注册
3. 在 `.env.example` 添加所需的环境变量
4. 在 `src/env.js` 添加环境变量 schema
5. 在 `EMAIL_PROVIDER` 中加入名称即可启用

