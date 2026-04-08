import type { Fulfiller, FulfillmentContext } from '../types'
import { createSubscription } from '@/server/membership/services/create-subscription'
import { createSubscriptionCycle } from '@/server/membership/services/create-subscription-cycle'
import { getProduct } from '@/server/product/services/get'
import { grant } from '@/server/billing/services/grant'
import { db } from '@/server/db'
import type { Prisma } from '@prisma/client'
import { cancelSubscriptionNow } from '@/server/membership/services/cancel-subscription-now'

function addDays(d: Date, days: number) {
  const nd = new Date(d)
  nd.setDate(nd.getDate() + days)
  return nd
}

function addMonths(d: Date, months: number) {
  const nd = new Date(d)
  nd.setMonth(nd.getMonth() + months)
  return nd
}

export const subscriptionFulfiller: Fulfiller = {
  canHandle(product) {
    return product.type === 'SUBSCRIPTION'
  },
  getName() {
    return 'SubscriptionFulfiller'
  },
  async fulfill(ctx: FulfillmentContext) {
    // 幂等：同一个 payment 只能履约一次（防止 webhook/补偿重放）
    // 订阅/周期/发放都应以 paymentId 作为幂等键。
    if (ctx.payment.id) {
      const existingCycle = await db.userSubscriptionCycle.findFirst({
        where: { paymentId: ctx.payment.id, deletedAt: null },
        select: { id: true },
      })
      if (existingCycle) return
    }

    // product.snapshot 已在订单中有，但这里直接读最新商品配置
    const product = await getProduct({ productId: ctx.order.productId })

    const purchaseQuantity = (() => {
      const q = ctx.order.quantity
      if (typeof q === 'number' && Number.isFinite(q) && q >= 1) return Math.floor(q)
      // fallback: legacy path (older orders), keep backward compatibility
      const paymentExtra = ctx.payment.extra as unknown
      const meta =
        paymentExtra &&
        typeof paymentExtra === 'object' &&
        'metadata' in (paymentExtra as Record<string, unknown>) &&
        (paymentExtra as { metadata?: Record<string, unknown> }).metadata
          ? (paymentExtra as { metadata?: Record<string, unknown> }).metadata!
          : undefined
      const mq = meta && typeof meta.quantity === 'number' && meta.quantity >= 1 ? Math.floor(meta.quantity) : 1
      return mq
    })()

    const rawInterval = product.productSubscription?.plan?.interval
    const interval = rawInterval
      ? (rawInterval.toLowerCase() as 'week' | 'month' | 'year')
      : undefined
    const intervalCount =
      product.productSubscription?.plan?.intervalCount && product.productSubscription.plan.intervalCount > 0
        ? product.productSubscription.plan.intervalCount
        : 1

    if (!interval) throw new Error('subscription plan missing interval')

    // 读取 Trial 配置（仅订阅商品会使用）
    const hasTrial = !!product.hasTrial && typeof product.trialDays === 'number' && product.trialDays > 0
    const trialDays = hasTrial ? product.trialDays! : 0
    const trialCredits =
      hasTrial && typeof product.trialCreditsAmount === 'number'
        ? product.trialCreditsAmount
        : 0

    const isNowPayments = (ctx.payment.paymentGateway ?? '').toUpperCase() === 'NOWPAYMENTS'

    // 创建或获取订阅
    // 注意：planId 应使用 subscriptionPlan 的 id，而非 product.id
    const realPlanId = product.productSubscription?.planId ?? product.id
    // 幂等：优先复用相同 gatewaySubscriptionId 的订阅记录（避免重复创建）
    const gatewaySubId =
      typeof ctx.payment.gatewaySubscriptionId === 'string' && ctx.payment.gatewaySubscriptionId.length > 0
        ? ctx.payment.gatewaySubscriptionId
        : undefined

    const existingSub = isNowPayments
      ? await db.userSubscription.findFirst({
          where: {
            userId: ctx.order.userId,
            planId: realPlanId,
            gateway: 'NOWPAYMENTS',
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
        })
      : gatewaySubId
        ? await db.userSubscription.findFirst({
            where: {
              userId: ctx.order.userId,
              gatewaySubscriptionId: gatewaySubId,
              deletedAt: null,
            },
          })
        : null

    const sub = existingSub
      ? existingSub
      : await createSubscription({
          userId: ctx.order.userId,
          planId: realPlanId,
          planSnapshot: JSON.parse(JSON.stringify(product)) as Prisma.JsonValue,
          gateway: ctx.payment.paymentGateway,
          gatewaySubscriptionId: gatewaySubId,
          // Crypto subscriptions are manual-renew by nature; mark as cancel at period end for clearer semantics.
          cancelAtPeriodEnd: isNowPayments ? true : undefined,
        })

    // =====================
    // NOWPAYMENTS manual renew / prepay:
    // If there is an active, unexpired cycle, extend it by one interval and grant credits immediately.
    // This is the simplest model to ship first.
    // =====================
    if (isNowPayments) {
      const now = new Date()
      const activeCycle = await db.userSubscriptionCycle.findFirst({
        where: {
          subscriptionId: sub.id,
          status: 'ACTIVE',
          expiresAt: { gt: now },
          deletedAt: null,
        },
        orderBy: { sequenceNumber: 'desc' },
      })

      if (activeCycle) {
        const periodStart = activeCycle.expiresAt
        const periodEnd = new Date(periodStart)
        if (interval === 'week') {
          periodEnd.setDate(periodEnd.getDate() + 7 * intervalCount * purchaseQuantity)
        } else if (interval === 'month') {
          periodEnd.setMonth(periodEnd.getMonth() + intervalCount * purchaseQuantity)
        } else if (interval === 'year') {
          periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount * purchaseQuantity)
        }

        await db.userSubscriptionCycle.update({
          where: { id: activeCycle.id },
          data: {
            expiresAt: periodEnd,
            // update anchor so future drip/analytics can reference last renewal
            lastCreditGrantAnchor: activeCycle.lastCreditGrantAnchor ?? now,
          },
        })

        // Credits drip:
        // - WEEK: grant per-week credits as separate future-dated credit accounts (so they unlock week-by-week)
        // - MONTH/YEAR: keep existing behavior (first month already granted at purchase time; monthly worker handles drip)
        const plan = product.productSubscription?.plan
        const creditsPerPeriod = plan?.creditsPerPeriod ?? plan?.creditsPerMonth ?? 0
        if (creditsPerPeriod > 0) {
          if (interval === 'week') {
            const periodDays = 7 * intervalCount
            for (let i = 0; i < purchaseQuantity; i++) {
              const creditStartsAt = addDays(periodStart, i * periodDays)
              const creditExpiresAt = addMonths(creditStartsAt, 1)
              const dayStr = creditStartsAt.toISOString().slice(0, 10) // YYYY-MM-DD
              const outerBizId = `subscription_cycle_${activeCycle.id}_credits_week_${dayStr}`
              await grant({
                userId: ctx.order.userId,
                accountType: 'CREDIT',
                subAccountType: 'MEMBERSHIP',
                amount: creditsPerPeriod,
                outerBizId,
                businessType: 'SUBSCRIPTION',
                referenceId: activeCycle.id,
                description: `Subscription weekly credits (${dayStr})`,
                startsAt: creditStartsAt,
                expiresAt: creditExpiresAt,
              })
            }
          }
        }

        return
      }
    }

    // 如果是「从已有订阅升级」场景，则在新订阅创建成功后，异步取消旧订阅
    const paymentExtra = ctx.payment.extra as unknown
    const metadata =
      paymentExtra &&
      typeof paymentExtra === 'object' &&
      'metadata' in (paymentExtra as Record<string, unknown>)
        ? ((paymentExtra as { metadata?: Record<string, unknown> }).metadata ?? undefined)
        : undefined

    const subscriptionUpgrade =
      metadata &&
      typeof metadata === 'object' &&
      'subscriptionUpgrade' in metadata
        ? ((metadata as { subscriptionUpgrade?: { fromSubscriptionId?: string } }).subscriptionUpgrade ??
          undefined)
        : undefined

    if (subscriptionUpgrade?.fromSubscriptionId) {
      void cancelSubscriptionNow({ subscriptionId: subscriptionUpgrade.fromSubscriptionId })
    }

    // ====== 分支 1：带 Trial 的订阅（下载付费墙路径） ======
    if (hasTrial && trialDays > 0 && trialCredits > 0) {
      const trialStartsAt = new Date()
      const trialExpiresAt = new Date(trialStartsAt)
      trialExpiresAt.setDate(trialExpiresAt.getDate() + trialDays)

      const trialCycle = await createSubscriptionCycle({
        subscriptionId: sub.id,
        paymentId: ctx.payment.id,
        uniqueKey: ctx.payment.id ? `pay_${ctx.payment.id}` : undefined,
        type: 'TRIAL',
        startsAt: trialStartsAt,
        expiresAt: trialExpiresAt,
      })

      // 授予 Trial 积分（使用 FREE_TRIAL 维度，便于后续分析）
      await grant({
        userId: ctx.order.userId,
        accountType: 'CREDIT',
        subAccountType: 'FREE_TRIAL',
        amount: trialCredits,
        outerBizId: `subscription_trial_${trialCycle.id}`,
        businessType: 'FREE_TRIAL',
        referenceId: trialCycle.id,
        description: `Subscription Trial Credits (${trialDays} days)`,
        startsAt: trialStartsAt,
        expiresAt: trialExpiresAt,
      })

      // Trial 周期的 lastCreditGrantAnchor 设为 trialStartsAt，供后续计算用
      await db.userSubscriptionCycle.update({
        where: { id: trialCycle.id },
        data: { lastCreditGrantAnchor: trialStartsAt },
      })

      // 更新 UserStats：标记已使用 Pro Trial，并记录来源
      const meta = (product.metadata ?? {}) as { useCase?: string } | null
      const proTrialSource = typeof meta?.useCase === 'string' ? meta.useCase : 'download_paywall'

      await db.userStats.upsert({
        where: { userId: ctx.order.userId },
        create: {
          userId: ctx.order.userId,
          hasUsedProTrial: true,
          proTrialSource,
        },
        update: {
          hasUsedProTrial: true,
          proTrialSource,
        },
      })

      // 注意：不在 Trial 开始时发放 creditsPerMonth（例如 40,000），
      // 而是等首个 invoice.payment_succeeded，通过 handleStripeSubscriptionRenewal
      // 为后续 REGULAR 周期发放正式会员积分。
      return
    }

    // ====== 分支 2：无 Trial 的普通订阅（原有逻辑） ======
    const startsAt = new Date()
    const expiresAt = new Date(startsAt)

    if (interval === 'week') {
      // Weekly plan: intervalCount * 7 days
      expiresAt.setDate(expiresAt.getDate() + 7 * intervalCount * purchaseQuantity)
    } else if (interval === 'month') {
      expiresAt.setMonth(expiresAt.getMonth() + intervalCount * purchaseQuantity)
    } else if (interval === 'year') {
      expiresAt.setFullYear(expiresAt.getFullYear() + intervalCount * purchaseQuantity)
    }

    const cycle = await createSubscriptionCycle({
      subscriptionId: sub.id,
      paymentId: ctx.payment.id,
      uniqueKey: ctx.payment.id ? `pay_${ctx.payment.id}` : undefined,
      type: 'REGULAR',
      startsAt,
      expiresAt,
    })

    // 首期授予积分（优先使用 creditsPerPeriod，兼容 creditsPerMonth）
    const plan = product.productSubscription?.plan
    const creditsPerPeriod = plan?.creditsPerPeriod ?? plan?.creditsPerMonth ?? 0
    if (creditsPerPeriod > 0) {
      if (interval === 'week') {
        // WEEK: create N separate weekly credit grants, each becomes active on its week start.
        const periodDays = 7 * intervalCount
        for (let i = 0; i < purchaseQuantity; i++) {
          const creditStartsAt = addDays(startsAt, i * periodDays)
          const creditExpiresAt = addMonths(creditStartsAt, 1)
          const dayStr = creditStartsAt.toISOString().slice(0, 10) // YYYY-MM-DD
          await grant({
            userId: ctx.order.userId,
            accountType: 'CREDIT',
            subAccountType: 'MEMBERSHIP',
            amount: creditsPerPeriod,
            outerBizId: `subscription_cycle_${cycle.id}_credits_week_${dayStr}`,
            businessType: 'SUBSCRIPTION',
            referenceId: cycle.id,
            description: `Subscription weekly credits (${dayStr})`,
            startsAt: creditStartsAt,
            expiresAt: creditExpiresAt,
          })
        }
      } else {
        // MONTH/YEAR: grant the first month immediately; monthly worker will drip the rest.
        const firstMonthCreditExpiresAt = addMonths(startsAt, 1)
        const monthStr = startsAt.toISOString().slice(0, 7) // YYYY-MM
        await grant({
          userId: ctx.order.userId,
          accountType: 'CREDIT',
          subAccountType: 'MEMBERSHIP',
          amount: creditsPerPeriod,
          outerBizId: `subscription_cycle_${cycle.id}_credits_${monthStr}`,
          businessType: 'SUBSCRIPTION',
          referenceId: cycle.id,
          description: `Subscription Credits (first month ${monthStr})`,
          startsAt,
          expiresAt: firstMonthCreditExpiresAt,
        })
      }

      // 记录积分发放锚点，供后续按月发放逻辑使用
      await db.userSubscriptionCycle.update({
        where: { id: cycle.id },
        data: { lastCreditGrantAnchor: startsAt },
      })
    }
  },
}


