import { db } from "@/server/db"
import type { Prisma } from '@prisma/client'
import type { CreateSubscriptionParams } from '../types'

export async function createSubscription(params: CreateSubscriptionParams) {
  const sub = await db.userSubscription.create({
    data: {
      userId: params.userId,
      planId: params.planId,
      planSnapshot: params.planSnapshot as Prisma.InputJsonValue,
      status: 'ACTIVE',
      gateway: params.gateway,
      gatewaySubscriptionId: params.gatewaySubscriptionId ?? '',
      cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
    },
  })
  return sub
}


