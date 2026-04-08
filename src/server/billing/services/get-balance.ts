import { db } from "@/server/db"
import type { GetBalanceParams, GetBalanceOutput, AccountSummary } from '../types'
import { TRPCError } from '@trpc/server'
import type { Prisma } from '@prisma/client'
import { grant } from './grant'
import { getSubscriptionStatus } from '@/server/membership/services/get-subscription-status'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { normalizeEmail } from '@/server/auth/normalize-email'
import { isFamousEmailDomain } from '@/server/auth/disposable-domains'

export async function getBalance(params: GetBalanceParams): Promise<GetBalanceOutput> {
  if (!params.userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'userId is required' })

  // Daily drip for FREE users: only when querying CREDIT balances, and only once per UTC day
  if (!params.accountType || params.accountType === 'CREDIT') {
    await maybeGrantDailyDrip(params.userId)
  }

  const where: Prisma.BillingAccountWhereInput = {
    userId: params.userId,
    ...(params.accountType ? { accountType: params.accountType } : {}),
  }

  const accounts = await db.billingAccount.findMany({
    where,
    orderBy: [{ accountType: 'asc' }, { subAccountType: 'asc' }],
  })

  const now = new Date()
  const summaries: AccountSummary[] = []
  let total = 0
  let used = 0
  let frozen = 0

  for (const a of accounts) {
    if (a.status !== 'ACTIVE') continue
    if (a.startsAt && now < a.startsAt) continue
    if (a.expiresAt && now > a.expiresAt) continue

    // 计入所有有效账户的 total/used/frozen（包括已用完的）
    total += a.totalAmount
    used += a.usedAmount
    frozen += a.frozenAmount

    const available = a.totalAmount - a.usedAmount - a.frozenAmount
    // accounts 数组只返回有余额的账户
    if (available <= 0) continue

    summaries.push({
      accountType: a.accountType as GetBalanceParams['accountType'] & string,
      subAccountType: a.subAccountType as AccountSummary['subAccountType'],
      total: a.totalAmount,
      used: a.usedAmount,
      frozen: a.frozenAmount,
      available,
      startsAt: a.startsAt,
      expiresAt: a.expiresAt,
    })
  }

  return {
    totalSummary: {
      total,
      used,
      frozen,
      available: total - used - frozen,
    },
    accounts: summaries,
  }
}

// 每日滴灌递减表：第0天(注册当天)300，第1天300，第2天250，第3天200，第4天及以后0
const DAILY_DRIP_AMOUNTS = [300, 300, 250, 200, 0] as const

function getDripAmountByDaysSinceSignup(daysSinceSignup: number): number {
  // daysSinceSignup = 0 表示注册当天，发 300
  // daysSinceSignup = 1 表示注册后第一天，发 250
  // ...以此类推
  if (daysSinceSignup < 0) return 0
  if (daysSinceSignup >= DAILY_DRIP_AMOUNTS.length) return 0
  return DAILY_DRIP_AMOUNTS[daysSinceSignup] ?? 0
}

async function maybeGrantDailyDrip(userId: string): Promise<void> {
  // Skip if user has active subscription (PLUS/PREMIUM)
  const sub = await getSubscriptionStatus({ userId }).catch(() => ({ status: 'NONE', currentCycle: null }))
  const hasActive = !!sub.currentCycle
  if (hasActive) return

  // Get user's timezone, email and createdAt from database
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { timezone: true, email: true, isPrimaryDeviceAccount: true, createdAt: true }
  })
  // 对"后续账号"（同一 deviceKey 下非首个账号）不发放每日积分
  if (user?.isPrimaryDeviceAccount === false) return

  // 如果首登奖励存在“待审核锁定额度”（PENDING/INVALID 等非 ACTIVE），则不发放每日滴灌
  // 目的：避免共享IP/风控审查期间持续送出每日积分；Grok 洗白解锁后立刻恢复
  if (user?.email) {
    const pendingOuterBizId = `initial_grant_pending_${normalizeEmail(user.email)}`
    const pending = await db.billingAccount.findUnique({
      where: { outerBizId: pendingOuterBizId },
      select: { status: true },
    })
    if (pending && pending.status !== 'ACTIVE') return
  }

  // 非著名邮箱域名不发放每日积分（只给登录奖励 299，无滴灌）
  if (user?.email && !isFamousEmailDomain(user.email)) return

  // flip_hkd 开头的邮箱不发放每日积分
  if (user?.email?.toLowerCase().startsWith('flip_hkd')) return

  const userTimezone = user?.timezone ?? 'UTC'
  
  // Use normalized email for deduplication (prevents Gmail aliases from getting multiple drips)
  // Falls back to userId for users without email
  const dripKey: string = user?.email ? normalizeEmail(user.email) : userId

  const now = new Date()
  
  // 计算用户注册后的天数（按用户本地时区计算日期差）
  const createdAt = user?.createdAt ?? now
  // Use user's timezone for consistent date calculation (Local Date Key)
  const createdYmd = createdAt.toLocaleDateString('en-CA', { timeZone: userTimezone })
  const nowYmd = now.toLocaleDateString('en-CA', { timeZone: userTimezone })

  const daysSinceSignup = Math.floor(
    (new Date(nowYmd).getTime() - new Date(createdYmd).getTime()) / (1000 * 60 * 60 * 24)
  )

  // 根据注册天数获取滴灌金额
  const amount = getDripAmountByDaysSinceSignup(daysSinceSignup)
  if (amount <= 0) return

  // Use Local Date for idempotency key (prevent duplicate grants on same local day)
  const outerBizId = `daily_drip_${dripKey}_${nowYmd}`

  // Expires at next day 00:00 in user's timezone (no carry-over)
  const nowInUserTz = toZonedTime(now, userTimezone)
  const tomorrowInUserTz = new Date(nowInUserTz)
  tomorrowInUserTz.setDate(tomorrowInUserTz.getDate() + 1)
  tomorrowInUserTz.setHours(0, 0, 0, 0)
  const expiresAt = fromZonedTime(tomorrowInUserTz, userTimezone)

  // Idempotent grant: grant() returns existing if already created with same outerBizId
  await grant({
    userId,
    accountType: 'CREDIT',
    subAccountType: 'DAILY_LOGIN',
    amount,
    outerBizId,
    businessType: 'UNDEFINED',
    startsAt: now,
    expiresAt,
    description: 'Daily Gift',
  }).catch(() => {
    // Swallow errors to avoid breaking balance reads
  })
}


