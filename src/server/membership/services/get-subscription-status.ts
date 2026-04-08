import { db } from "@/server/db"
import type { GetSubscriptionStatusParams, SubscriptionStatusResult, SubscriptionPlanType } from '../types'

export async function getSubscriptionStatus(params: GetSubscriptionStatusParams): Promise<SubscriptionStatusResult> {
  const now = new Date()
  const sub = await db.userSubscription.findFirst({
    where: { userId: params.userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  })

  if (!sub) return { status: 'NONE' }

  // 并行查询 cycle 和 plan type
  const [cycle, plan] = await Promise.all([
    db.userSubscriptionCycle.findFirst({
      // 权益以周期为准：必须是 ACTIVE 且未过期的周期
      where: { subscriptionId: sub.id, status: 'ACTIVE', expiresAt: { gt: now } },
      orderBy: { sequenceNumber: 'desc' },
    }),
    db.subscriptionPlan.findUnique({
      where: { id: sub.planId },
      select: { type: true },
    }),
  ])

  // 将 plan.type 映射到我们的类型
  const planType: SubscriptionPlanType | undefined = 
    plan?.type === 'STARTER' || plan?.type === 'PLUS' || plan?.type === 'PREMIUM'
      ? plan.type
      : undefined

  return {
    status: sub.status,
    subscriptionId: sub.id,
    planType,
    currentCycle: cycle
      ? {
          id: cycle.id,
          type: cycle.type,
          status: cycle.status,
          startsAt: cycle.startsAt,
          expiresAt: cycle.expiresAt,
        }
      : undefined,
  }
}


