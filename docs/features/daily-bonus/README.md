# 每日签到赠送（Daily Bonus）

## 功能说明

用户每天首次访问时自动赠送积分，连续签到天数越多，每日赠送量逐步衰减（鼓励留存但控制成本）。中断签到则重置为初始值。

### 为什么有用

- **新用户激活**：零门槛获取初始积分，降低试用摩擦
- **日活提升**：每日一次的回访动机
- **成本可控**：衰减机制避免无限发放

## 依赖

- **Velobase Billing** — 通过 `grant()` 发放积分，通过 `ledger()` 查询签到历史
- **Auth** — 需要用户已登录（获取 `userId`）

## 代码位置

```
src/server/features/daily-bonus/
├── grant-daily-bonus.ts   # 全部逻辑（常量 + 策略函数 + 核心流程）
└── index.ts               # 导出
```

## 启用/禁用

不需要配置开关。需要此功能时调用 `grantDailyBonus(userId)`，不需要时不调用即可。

```typescript
import { grantDailyBonus } from '@/server/features/daily-bonus'

const result = await grantDailyBonus(userId)
// result: { granted: boolean, amount: number, reason: string, streakDays: number }
```

### 幂等性

基于 `daily_bonus_{userId}_{YYYY-MM-DD}` 作为 idempotencyKey，同一天内重复调用不会重复发放。

## AI 修改指南

所有可调整的内容集中在 `grant-daily-bonus.ts` 一个文件中，分为两个区域：

### 1. 策略常量（文件顶部）

修改文件顶部的常量来调整赠送参数：

```typescript
const BASE_AMOUNT = 5             // 首日赠送积分
const MIN_AMOUNT = 1              // 衰减下限
const DECAY_PER_DAY = 1           // 每多一天连续签到，赠送量减少多少
const RESET_AFTER_MISSED_DAYS = 1 // 中断几天后重置回首日赠送量
const EXPIRY_DAYS = 30            // 赠送积分有效天数（0 = 永不过期）
```

示例：「首日送 10，每天递减 2，最低 2」→ 改 `BASE_AMOUNT = 10`，`DECAY_PER_DAY = 2`，`MIN_AMOUNT = 2`

### 2. 策略函数 `calculateAmount(streakDays)`

修改此函数来改变赠送公式。默认是线性衰减，以下是几种常见替代策略：

**固定值**（每天都送相同积分）：

```typescript
function calculateAmount(_streakDays: number): number {
  return BASE_AMOUNT
}
```

**递增**（签到越多送越多）：

```typescript
function calculateAmount(streakDays: number): number {
  return Math.min(MAX_AMOUNT, BASE_AMOUNT + streakDays * GROWTH_PER_DAY)
}
```

**阶梯式**（按天数区间给不同积分）：

```typescript
function calculateAmount(streakDays: number): number {
  if (streakDays < 3) return 5
  if (streakDays < 7) return 3
  if (streakDays < 30) return 2
  return 1
}
```

### 3. 不需要修改的部分

- `grantDailyBonus()` — 核心流程（幂等、发放、日志），一般不需要动
- `calculateStreak()` — 连续天数计算，一般不需要动

