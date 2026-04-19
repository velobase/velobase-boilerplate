# 认证（Auth）集成文档

> 第三方集成梳理 · 第 1 站

## 1. 选型

### 支持的认证方式


| 认证方式       | 三方服务         | 用途                          | 状态    |
| ---------- | ------------ | --------------------------- | ----- |
| OAuth 社交登录 | Google       | 主流用户一键登录                    | ✅ 已接入 |
| OAuth 社交登录 | GitHub       | 开发者用户一键登录                   | ✅ 已接入 |
| 邮箱魔法链接     | Resend（SMTP） | 无密码登录，覆盖无 Google/GitHub 的用户 | ✅ 已接入 |
| 密码登录       | 内置（bcrypt）   | 仅限白名单邮箱，用于测试/合作方            | ✅ 已接入 |


### 选型理由

- **Google OAuth**：全球用户覆盖最广，SaaS 产品标配。
- **GitHub OAuth**：面向开发者用户群体的产品必备，注册转化率高。
- **邮箱魔法链接**：无密码登录，安全性高，覆盖不使用 Google/GitHub 的用户。通过 Resend SMTP 发送。
- **密码登录**：仅用于特殊场景（测试账号、合作方审核），通过白名单严格控制。

### 共存关系

所有认证方式共存，不互斥。同一邮箱可通过不同方式登录同一账号（NextAuth 的 Account linking 机制）。

### 风控组件（内置）


| 组件                   | 说明                           |
| -------------------- | ---------------------------- |
| 一次性邮箱拦截              | 阻止 tempmail 等一次性邮箱注册         |
| Cloudflare Turnstile | 可选的人机验证（需配置密钥才启用）            |
| 限流                   | 邮箱 3 次/小时，IP 10 次/小时         |
| Gmail 特殊处理           | 拦截 dot trick 和 plus alias 滥用 |
| 设备指纹                 | 检测同设备多账号                     |
| 同 IP 检测              | 短时间同 IP 注册多账号触发审核            |
| 用户封禁                 | 封禁用户无法登录                     |


## 2. 架构设计

### 技术基础

- **NextAuth v5**（`next-auth@5.0.0-beta.25`）
- **会话策略**：JWT（兼容 Credentials Provider）
- **数据库适配器**：自定义 PrismaAdapter（处理 Gmail 去重、magic link 多次点击等边界情况）
- **密码哈希**：bcryptjs

### 目录结构

```
src/server/auth/
├── index.ts                    # 统一导出：auth, handlers, signIn, signOut
├── config.ts                   # NextAuth 配置（providers, callbacks, events）
├── prisma-adapter.ts           # 自定义 Prisma 适配器
├── password.ts                 # 密码哈希/验证
├── password-login-allowlist.ts # 密码登录白名单
├── normalize-email.ts          # 邮箱规范化（Gmail dot trick 处理）
├── disposable-domains.ts       # 一次性邮箱域名列表
├── turnstile.ts                # Cloudflare Turnstile 验证
├── email-abuse.ts              # 同 IP/邮箱滥用检测
└── jwt.ts                      # JWT 工具函数

src/components/auth/
├── use-login.ts                # 客户端登录逻辑 hook（逻辑壳）
├── login-content.tsx           # 登录 UI（UI 皮肤）
├── login-modal-mobile.tsx      # 移动端登录弹窗
├── welcome-back-dialog.tsx     # 欢迎回来弹窗
└── store/
    └── auth-store.ts           # 登录弹窗状态管理
```

### 代码分层

```
config.ts 中的代码分为两层：

┌─────────────────────────────────────────────────────┐
│  核心认证逻辑（框架通用）                              │
│  - Provider 配置（Google, GitHub, Email, Credentials）│
│  - Session/JWT callbacks                             │
│  - 签到回调、重定向                                    │
│  - 风控（限流、一次性邮箱、Turnstile）                  │
└─────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│  业务钩子（按需定制）                                  │
│  - 新用户积分发放                                     │
│  - 推荐码绑定                                        │
│  - UTM/广告归因                                      │
│  - 设备指纹记录                                      │
│  - PostHog 事件追踪                                  │
└─────────────────────────────────────────────────────┘
```

`events.signIn` 和 `events.createUser` 中的业务钩子是定制点——不同产品会有不同的新用户引导逻辑。核心认证逻辑则是所有 SaaS 通用的。

### 数据流

```
用户点击登录
    │
    ├── Google OAuth ──→ Google 授权 ──→ 回调 ──→ NextAuth
    ├── GitHub OAuth ──→ GitHub 授权 ──→ 回调 ──→ NextAuth
    ├── Email ─────────→ 限流检查 ──→ 风控检查 ──→ 发送 Magic Link ──→ 用户点击 ──→ NextAuth
    └── Password ──────→ 白名单检查 ──→ 密码验证 ──→ NextAuth
                                                       │
                                                       ▼
                                              signIn callback
                                              （封禁检查、注册关闭检查）
                                                       │
                                                       ▼
                                              events.signIn / createUser
                                              （积分、推荐、归因 — 业务钩子）
                                                       │
                                                       ▼
                                              JWT 生成 → Session 可用
```

## 3. 接口定义

### 服务端接口

```typescript
// 获取当前用户 session（Server Component / Route Handler / tRPC context）
import { auth } from "@/server/auth";
const session = await auth();
// session.user: { id, email, name, image, isAdmin, isBlocked }

// tRPC 中使用 protectedProcedure 自动要求认证
import { protectedProcedure } from "@/server/api/trpc";
// ctx.session.user 自动可用，未认证会抛出 UNAUTHORIZED 错误

// 服务端主动登录/登出（少用）
import { signIn, signOut } from "@/server/auth";
```

### 客户端接口

```typescript
// 登录 hook（封装了所有登录逻辑）
import { useLogin } from "@/components/auth/use-login";
const login = useLogin();
// login.handleOAuthLogin("google")  — 发起 Google OAuth
// login.handleOAuthLogin("github")  — 发起 GitHub OAuth
// login.handleOAuthLogin("xxx")     — 发起任意已注册的 OAuth
// login.handleFormSubmit(e)         — 提交邮箱/密码表单
// login.view                       — 当前视图: "main" | "email" | "email-sent"
// login.error                      — 错误信息
// login.isLoading                   — 加载状态

// Session hook（获取当前用户状态）
import { useSession } from "next-auth/react";
const { data: session, status } = useSession();

// 登录弹窗控制
import { useAuthStore } from "@/components/auth/store/auth-store";
const { setLoginModalOpen } = useAuthStore();
```

### 功能边界

**认证模块做的事：**

- 用户注册和登录（多种方式）
- 会话管理（JWT 创建、刷新、验证）
- 风控（限流、一次性邮箱拦截、人机验证）
- 用户封禁检查

**认证模块不做的事：**

- 用户个人资料管理（属于 account 模块）
- 权限/角色管理（除 isAdmin 外，属于业务逻辑）
- 积分发放逻辑（属于 billing 模块，但通过 events 钩子触发）

## 4. 配置

### 环境变量

#### 必填


| 变量             | 说明                    | 获取方式                            |
| -------------- | --------------------- | ------------------------------- |
| `NEXTAUTH_SECRET`  | NextAuth 加密密钥（生产环境必填） | 运行 `openssl rand -base64 32` 生成 |
| `DATABASE_URL` | PostgreSQL 连接字符串      | 数据库服务商提供                        |


#### OAuth Provider（至少配一个）


| 变量                   | 说明                             | 获取方式                                                                                                 |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `AUTH_GOOGLE_ID`     | Google OAuth Client ID         | [Google Cloud Console](https://console.cloud.google.com/) → APIs → Credentials → OAuth 2.0 Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret     | 同上                                                                                                   |
| `AUTH_GITHUB_ID`     | GitHub OAuth App Client ID     | [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New OAuth App     |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret | 同上                                                                                                   |


Google OAuth 回调地址：`https://yourdomain.com/api/auth/callback/google`
GitHub OAuth 回调地址：`https://yourdomain.com/api/auth/callback/github`

#### 邮箱登录


| 变量               | 说明                                     | 获取方式                                               |
| ---------------- | -------------------------------------- | -------------------------------------------------- |
| `RESEND_API_KEY` | Resend API Key（用于发送 Magic Link）        | [Resend Dashboard](https://resend.com/) → API Keys |
| `EMAIL_FROM`     | 发件人地址，如 `App <noreply@yourdomain.com>` | 需在 Resend 中验证域名                                    |


#### 可选（风控增强）


| 变量                               | 说明                         | 获取方式                                                             |
| -------------------------------- | -------------------------- | ---------------------------------------------------------------- |
| `TURNSTILE_SECRET_KEY`           | Cloudflare Turnstile 服务端密钥 | [Cloudflare Dashboard](https://dash.cloudflare.com/) → Turnstile |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile 客户端密钥 | 同上                                                               |


### 第三方平台配置

#### Google OAuth

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目（或选择已有项目）
3. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs: `https://yourdomain.com/api/auth/callback/google`
6. 复制 Client ID 和 Client Secret 到环境变量

#### GitHub OAuth

1. 前往 [GitHub Developer Settings](https://github.com/settings/developers)
2. OAuth Apps → New OAuth App
3. Application name: 你的应用名
4. Homepage URL: `https://yourdomain.com`
5. Authorization callback URL: `https://yourdomain.com/api/auth/callback/github`
6. 复制 Client ID 和 Client Secret 到环境变量

#### Resend（邮箱登录）

1. 注册 [Resend](https://resend.com/)
2. 验证你的发件域名（DNS 记录配置）
3. 创建 API Key
4. 复制到 `RESEND_API_KEY`

## 5. 异常处理

### 限流


| 场景                  | 策略      | 错误信息                                                |
| ------------------- | ------- | --------------------------------------------------- |
| 同一邮箱频繁请求 Magic Link | 3 次/小时  | `Too many requests. Please try again in X seconds.` |
| 同一 IP 频繁请求          | 10 次/小时 | 同上                                                  |


### 邮件发送失败

- Magic Link 发送失败时返回明确错误提示
- 记录日志，包含失败原因
- PostHog 追踪发送失败事件

### 一次性邮箱

- 维护一份一次性邮箱域名列表（`disposable-domains.ts`）
- 注册时检查，命中则拒绝并返回提示

### 封禁用户

- 用户主动注销：显示"账号已删除"
- 管理员封禁：显示"账号已暂停"
- 重定向到 `/auth/blocked` 页面

### OAuth 回调失败

- NextAuth 内部处理 OAuth 错误
- 失败时重定向到 `/auth/signin?error=OAuthCallbackError`

### 密码登录

- 非白名单邮箱：直接拒绝
- 密码错误：返回通用错误（不区分"用户不存在"和"密码错误"，防止枚举）
- 账号被封禁：返回封禁提示

## 6. AI 引导

### 类型约束（强制）

```typescript
// tRPC 中所有需要用户身份的操作必须使用 protectedProcedure
// 这是类型层面的强制——publicProcedure 的 ctx 中没有 session.user
export const myRouter = createTRPCRouter({
  // ✅ 正确：mutation 用 protectedProcedure
  createPost: protectedProcedure
    .input(z.object({ title: z.string() }))
    .mutation(({ ctx }) => {
      // ctx.session.user.id 自动可用且类型安全
    }),

  // ❌ 错误：mutation 用 publicProcedure（无法获取用户身份）
  createPost: publicProcedure
    .mutation(({ ctx }) => {
      // ctx.session 可能为 null
    }),
});
```

### 默认行为（自动生效）

- `protectedProcedure` 自动检查认证状态，未登录抛出 `UNAUTHORIZED`
- JWT session 自动刷新
- Prisma adapter 自动处理用户创建和 account linking
- 限流自动应用于 magic link 请求

### AI 使用规则（写入 AGENTS.md）

```markdown
## 认证

- 所有需要用户身份的 tRPC procedure 必须使用 `protectedProcedure`
- 在 Server Component 中获取用户：`const session = await auth()`
- 在客户端获取用户：`useSession()` from `next-auth/react`
- 不要直接操作 JWT 或 session token
- 不要在客户端存储敏感的认证信息
- 登录逻辑统一通过 `useLogin()` hook，不要直接调用 `signIn()`
```

