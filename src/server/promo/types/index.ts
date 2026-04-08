import type { PromoCodeStatus, PromoGrantType } from '@prisma/client'

export type ValidateCodeParams = {
  code: string
  userId: string
}

export type ValidateCodeResult = {
  valid: boolean
  status: PromoCodeStatus
  grantType: PromoGrantType
  creditsAmount?: number
  productId?: string | null
  userUsedCount: number
  errorMessage?: string
}

export type RedeemCodeParams = {
  code: string
  userId: string
  ipAddress?: string
  userAgent?: string
}

export type RedeemCodeResult = {
  success: boolean
  message: string
  creditsGranted?: number
  newBalance?: number
  redemptionId?: string
}



