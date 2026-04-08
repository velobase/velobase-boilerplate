import type { Product } from '@prisma/client'

export type DomainProductType =
  | 'SUBSCRIPTION'
  | 'ONE_TIME_ENTITLEMENT'
  | 'CREDITS_PACKAGE'
  | 'ONE_TIME'

export interface SubscriptionConfig {
  kind: 'SUBSCRIPTION'
  interval: 'month' | 'year'
  intervalCount?: number
  creditsPerMonth?: number
  planId?: string
}

export interface CreditsPackageConfig {
  kind: 'CREDITS_PACKAGE'
  creditsAmount: number
}

export interface OneTimeEntitlementConfigItem {
  key: string
  value: unknown
  expiresInDays?: number
}

export interface OneTimeEntitlementConfig {
  kind: 'ONE_TIME_ENTITLEMENT'
  entitlements: OneTimeEntitlementConfigItem[]
}

export type ProductConfig =
  | SubscriptionConfig
  | CreditsPackageConfig
  | OneTimeEntitlementConfig

export type ProductView = Product & {
  type: DomainProductType
  metadata?: Record<string, unknown> | null
  config?: ProductConfig
}


