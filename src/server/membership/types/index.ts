export type UserSubscriptionStatus =
  | 'UNDEFINED'
  | 'INCOMPLETE'
  | 'INCOMPLETE_EXPIRED'
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'UNPAID'
  | 'PAUSED'
  | 'CANCELED'
export type UserSubscriptionCycleType = 'UNDEFINED' | 'REGULAR' | 'TRIAL'
export type UserSubscriptionCycleStatus = 'UNDEFINED' | 'ACTIVE' | 'CLOSED'
export type UserEntitlementSourceType = 'UNDEFINED' | 'SUBSCRIPTION_CYCLE' | 'ORDER' | 'PROMOTION'
export type UserEntitlementStatus = 'UNDEFINED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'

import type { Prisma } from '@prisma/client'

export type CreateSubscriptionParams = {
  userId: string
  planId: string
  planSnapshot: Prisma.JsonValue
  gateway: string
  gatewaySubscriptionId?: string
  cancelAtPeriodEnd?: boolean
}

export type CreateSubscriptionCycleParams = {
  subscriptionId: string
  paymentId?: string
  /**
   * Idempotency key for cycle creation (DB UNIQUE).
   * Use this to prevent duplicate cycles under concurrent webhook retries.
   */
  uniqueKey?: string
  type: UserSubscriptionCycleType
  startsAt: Date
  expiresAt: Date
}

export type GetSubscriptionStatusParams = {
  userId: string
}

export type SubscriptionPlanType = 'FREE' | 'STARTER' | 'PLUS' | 'PREMIUM'

export type SubscriptionStatusResult = {
  status: UserSubscriptionStatus | 'NONE'
  subscriptionId?: string
  /** Plan type: STARTER (weekly), PLUS (pro), PREMIUM */
  planType?: SubscriptionPlanType
  currentCycle?: {
    id: string
    type: UserSubscriptionCycleType
    status: UserSubscriptionCycleStatus
    startsAt: Date
    expiresAt: Date
  }
}

export type GrantDailyLoginCreditParams = {
  userId: string
  amount: number
}


