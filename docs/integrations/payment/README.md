# 支付集成（Payment）

## 1. 选型


| Gateway         | 用途                   | 状态   |
| --------------- | -------------------- | ---- |
| **Stripe**      | 信用卡 / 订阅 / 退款        | ✅ 主力 |
| **NowPayments** | 加密货币（USDT/BTC/ETH 等） | ✅ 可选 |


> Airwallex、Telegram Stars、Waffo 已移除。

---

## 2. 架构

```
src/server/
├── order/                         # 订单 + 支付核心
│   ├── providers/
│   │   ├── types.ts               # PaymentProvider 统一接口
│   │   ├── registry.ts            # Provider 注册表
│   │   ├── stripe.ts              # Stripe 实现
│   │   └── nowpayments.ts         # NowPayments 实现
│   ├── services/
│   │   ├── init-providers.ts      # 按 env 自动注册 Provider
│   │   ├── resolve-gateway.ts     # 网关选择（默认 Stripe）
│   │   ├── checkout.ts            # 结账编排
│   │   ├── handle-webhooks.ts     # Webhook 处理 + 状态更新
│   │   ├── confirm-payment.ts     # 主动轮询支付状态
│   │   ├── stripe-customer.ts     # Stripe Customer 管理
│   │   └── payment-transactions.ts # 不可变流水记录
│   ├── schemas/                   # Zod 输入校验
│   ├── routers/                   # tRPC 路由
│   └── types/                     # 类型定义
├── billing/                       # 积分账户 + 扣费
├── membership/                    # 订阅状态 + 周期管理
├── fulfillment/                   # 支付成功后的权益发放
└── product/                       # 商品 + 定价
```

### 数据流

```
用户点击购买
  → tRPC order.checkout
    → resolvePaymentGateway()         // 默认 STRIPE
    → checkout.ts 创建 Order + Payment
    → provider.createPayment()        // 生成 Stripe Checkout URL
  → 用户在 Stripe 页面付款
  → Stripe → POST /api/webhooks/stripe
    → handlePaymentWebhook()
      → 状态更新 Payment → SUCCEEDED
      → processFulfillmentByPayment() // 发放权益
      → recordPaymentTransaction()    // 不可变流水
      → asyncSendPaymentNotification()// Lark 通知
```

### Provider 接口

```typescript
interface PaymentProvider {
  createPayment(params): Promise<PaymentResult>
  createSubscription?(params): Promise<SubscriptionResult>
  handlePaymentWebhook(req): Promise<PaymentWebhookResult | null>
  handleSubscriptionWebhook?(req): Promise<PaymentWebhookResult | null>
  confirmPayment?(params): Promise<{ isPaid: boolean; ... }>
  expireCheckoutSession?(sessionId): Promise<void>
}
```

---

## 3. 对外接口

### 发起购买

```typescript
const result = await trpc.order.checkout.mutate({
  productId: "prod_xxx",
  successUrl: "https://app.com/payment/success",
  cancelUrl: "https://app.com/pricing",
  gateway: "STRIPE",           // 可选，默认 STRIPE
  metadata: { source: "landing" },
})

if (result.url) {
  window.location.href = result.url
}
```

### 查询订阅状态

```typescript
const status = await trpc.membership.getSubscriptionStatus.query({ userId })
// → { status: "ACTIVE", currentCycle: { ... }, planSnapshot: { ... } }
```

### 查询积分余额

```typescript
const balance = await trpc.billing.getBalance.query()
// → { available: 100, pending: 0 }
```

---

## 4. 配置

### 环境变量

```env
# Stripe（必需）
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# NowPayments（可选，启用加密货币支付）
NOWPAYMENTS_API_KEY=xxx
NOWPAYMENTS_IPN_SECRET=xxx
NOWPAYMENTS_PAY_CURRENCY=usdttrc20

# 强制指定网关（仅测试用）
# FORCE_PAYMENT_GATEWAY=NOWPAYMENTS
```

### Stripe Dashboard 配置

1. **Webhook Endpoint**：`https://your-domain.com/api/webhooks/stripe`
2. **监听事件**：
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.succeeded`
  - `charge.refunded`
  - `charge.dispute.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`

### 本地开发（Docker 方式，推荐）

无需安装 Stripe CLI，通过 Docker Compose 一键启动：

```bash
# 1. 确保 .env 中已配置 STRIPE_SECRET_KEY
#    STRIPE_SECRET_KEY=sk_test_xxx

# 2. 启动 Stripe CLI 容器（前台运行，可看到日志）
make stripe

# 3. 从输出中复制 webhook signing secret：
#    > Ready! Your webhook signing secret is whsec_xxx
#    将 whsec_xxx 写入 .env 的 STRIPE_WEBHOOK_SECRET

# 4. 停止 Stripe CLI
make stripe-stop
```

> `stripe-cli` 使用 Docker `profiles`，不会随 `make db` 一起启动，需要单独运行。

### 本地开发（手动安装 CLI）

```bash
# 安装 Stripe CLI
brew install stripe/stripe-cli/stripe   # macOS
# 或 scoop install stripe               # Windows

# 登录
stripe login

# 转发 webhook 到本地
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# 将输出的 whsec_xxx 写入 .env 的 STRIPE_WEBHOOK_SECRET
```

---

## 5. 异常处理

### Webhook 幂等

- `PaymentWebhookLog` 表按 `eventId` 去重，重复事件直接跳过
- 支付状态只允许「升级」（PENDING → SUCCEEDED），不允许降级
- 订阅周期通过 `outerBizId` 确保续费积分不重复发放

### 常见场景


| 场景           | 处理方式                                            |
| ------------ | ----------------------------------------------- |
| Webhook 重复到达 | `PaymentWebhookLog` 幂等拦截                        |
| Webhook 乱序   | 状态只升级不降级                                        |
| 履约失败         | 抛 `WebhookFulfillmentError`，返回 500 触发 Stripe 重试 |
| Checkout 过期  | 定期清理 PENDING 状态的 Payment                        |
| 退款/争议        | Webhook 处理退款，冻结积分并通知                            |


---

## 6. AI 引导

### 规则（写入 AGENTS.md）

1. **发起支付**：必须通过 `trpc.order.checkout` tRPC，禁止直接调用 Stripe SDK
2. **支付状态更新**：仅由 Webhook 驱动，前端轮询 `confirmPayment` 仅作补偿
3. **权益发放**：通过 `fulfillment/manager.ts`，禁止在 Webhook handler 中直接操作用户余额
4. **积分操作**：通过 `billing` 域的 `grant/deduct`，不直接写 DB
5. **订阅管理**：通过 `membership` 域，禁止直接操作 `UserSubscription` 表
6. **新增支付网关**：实现 `PaymentProvider` 接口 → 在 `init-providers.ts` 注册 → 添加 Webhook 路由
7. **不可变流水**：每笔资金变动必须有 `PaymentTransaction` 记录

### 常见错误

- ❌ 在前端直接创建 Stripe PaymentIntent
- ❌ 在 Webhook handler 中直接 `db.user.update({ credits })` 
- ❌ 忘记在 Stripe Dashboard 配置 Webhook endpoint
- ❌ 硬编码商品价格，应通过 Product 表查询

