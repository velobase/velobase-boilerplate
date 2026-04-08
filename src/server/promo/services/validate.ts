import { db } from "@/server/db"
import type { ValidateCodeParams, ValidateCodeResult } from '../types'
import type { PromoCodeStatus } from '@prisma/client'

export async function validateCode(params: ValidateCodeParams): Promise<ValidateCodeResult> {
  const code = params.code.trim().toUpperCase()
  const userId = params.userId.trim()

  if (!code || !userId) {
    return { valid: false, status: 'UNDEFINED', grantType: 'UNDEFINED', userUsedCount: 0, errorMessage: 'invalid params' }
  }

  const promo = await db.promoCode.findFirst({ where: { code, deletedAt: null } })
  if (!promo) {
    return { valid: false, status: 'UNDEFINED', grantType: 'UNDEFINED', userUsedCount: 0, errorMessage: 'code not found' }
  }

  const now = new Date()
  // status check
  if (promo.status !== 'ACTIVE') {
    return { valid: false, status: promo.status as PromoCodeStatus, grantType: promo.grantType, userUsedCount: 0, errorMessage: 'code not active' }
  }
  if (promo.startsAt && promo.startsAt > now) {
    return { valid: false, status: promo.status as PromoCodeStatus, grantType: promo.grantType, userUsedCount: 0, errorMessage: 'code not started' }
  }
  if (promo.expiresAt && promo.expiresAt < now) {
    return { valid: false, status: 'EXPIRED', grantType: promo.grantType, userUsedCount: 0, errorMessage: 'code expired' }
  }
  if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
    return { valid: false, status: promo.status as PromoCodeStatus, grantType: promo.grantType, userUsedCount: 0, errorMessage: 'code used out' }
  }

  if (promo.grantType === 'CREDIT' && (!promo.creditsAmount || promo.creditsAmount <= 0)) {
    return { valid: false, status: promo.status as PromoCodeStatus, grantType: promo.grantType, userUsedCount: 0, errorMessage: 'code not configured' }
  }

  const userUsedCount = await db.promoCodeRedemption.count({ where: { promoCodeId: promo.id, userId } })
  if (promo.perUserLimit > 0 && userUsedCount >= promo.perUserLimit) {
    return { valid: false, status: promo.status as PromoCodeStatus, grantType: promo.grantType, userUsedCount, errorMessage: userUsedCount > 0 ? 'already redeemed' : 'per user limit reached' }
  }

  return {
    valid: true,
    status: promo.status as PromoCodeStatus,
    grantType: promo.grantType,
    creditsAmount: promo.creditsAmount ?? undefined,
    productId: promo.productId ?? undefined,
    userUsedCount,
  }
}



