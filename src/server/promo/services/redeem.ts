import { db } from "@/server/db"
import { grant } from '@/server/billing/services/grant'
import { processFulfillmentByPayment } from '@/server/fulfillment/manager'
import type { BillingAccountType, BillingSubAccountType, BillingBusinessType } from '@prisma/client'
import { Prisma } from '@prisma/client'
import type { RedeemCodeParams, RedeemCodeResult } from '../types'
import { validateCode } from './validate'

function hash32(input: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h | 0
}

export async function redeemCode(params: RedeemCodeParams): Promise<RedeemCodeResult> {
  const code = params.code.trim().toUpperCase()
  const userId = params.userId.trim()

  const v = await validateCode({ code, userId })
  if (!v.valid) {
    return { success: false, message: v.errorMessage ?? 'invalid code' }
  }

  const promo = await db.promoCode.findFirst({ where: { code, deletedAt: null } })
  if (!promo) return { success: false, message: 'code not found' }

  if (promo.grantType === 'CREDIT') {
    try {
      const res = await db.$transaction(async (tx) => {
        // Serialize per-user-per-code redemption to avoid duplicate redemptions/usedCount drift
        // even when DB unique constraints are not yet applied.
        const lock1 = hash32(`promo:${code}`)
        const lock2 = hash32(`user:${userId}`)
        // pg_advisory_xact_lock has signature (int4, int4) or (int8); Prisma binds params as int8 by default,
        // so we cast explicitly to int4 to avoid "function ... (bigint, bigint) does not exist".
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lock1}::int4, ${lock2}::int4)`

        const promo = await tx.promoCode.findFirst({ where: { code, deletedAt: null } })
        if (!promo) return { ok: false as const, message: 'code not found' }

        const now = new Date()
        if (promo.status !== 'ACTIVE') return { ok: false as const, message: 'code not active' }
        if (promo.startsAt && promo.startsAt > now) return { ok: false as const, message: 'code not started' }
        if (promo.expiresAt && promo.expiresAt < now) return { ok: false as const, message: 'code expired' }
        if (!promo.creditsAmount || promo.creditsAmount <= 0) return { ok: false as const, message: 'code not configured' }

        // idempotency (same user)
        const existing = await tx.promoCodeRedemption.findFirst({ where: { promoCodeId: promo.id, userId } })
        if (existing) return { ok: false as const, message: 'already redeemed' }

        // Per-user limit (defensive; current behavior is effectively 1 redemption per user)
        if (promo.perUserLimit > 0) {
          const userUsedCount = await tx.promoCodeRedemption.count({ where: { promoCodeId: promo.id, userId } })
          if (userUsedCount >= promo.perUserLimit) return { ok: false as const, message: userUsedCount > 0 ? 'already redeemed' : 'per user limit reached' }
        }

        // Global usage limit: claim a slot atomically (so we don't over-grant in concurrency).
        if (promo.usageLimit > 0) {
          const updated = await tx.promoCode.updateMany({
            where: { id: promo.id, usedCount: { lt: promo.usageLimit } },
            data: { usedCount: { increment: 1 } },
          })
          if (updated.count === 0) return { ok: false as const, message: 'code used out' }
        } else {
          await tx.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } })
        }

        const outerBizId = `promo_${promo.id}_${userId}`
        const grantRes = await grant(
          {
            userId,
            accountType: 'CREDIT' as BillingAccountType,
            subAccountType: 'PROMO_CODE' as BillingSubAccountType,
            amount: promo.creditsAmount,
            outerBizId,
            businessType: 'ADMIN_GRANT' as BillingBusinessType,
            referenceId: promo.id,
            description: `Promo Code - ${promo.code}`,
          },
          tx
        )

        const redemption = await tx.promoCodeRedemption.create({
          data: {
            promoCodeId: promo.id,
            userId,
            billingAccountId: grantRes.accountId,
            billingRecordId: grantRes.recordId,
            creditsGranted: grantRes.addedAmount,
            ipAddress: params.ipAddress ?? null,
            userAgent: params.userAgent ?? null,
          },
        })

        return { ok: true as const, creditsGranted: grantRes.addedAmount, redemptionId: redemption.id }
      })

      if (!res.ok) return { success: false, message: res.message }
      return { success: true, message: 'redeemed', creditsGranted: res.creditsGranted, redemptionId: res.redemptionId }
    } catch (err) {
      // Concurrency: unique constraint on (promoCodeId, userId)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { success: false, message: 'already redeemed' }
      }
      throw err
    }
  }

  if (promo.grantType === 'PRODUCT') {
    if (!promo.productId) return { success: false, message: 'product not configured' }

    // Create a zero-amount payment/order snapshotless fulfillment approach:
    // We reuse fulfillment by creating minimal Payment pointing to existing order would be heavy; instead, call specific fulfillers by product type in future.
    // For now create a synthetic payment+order relationship to reuse manager.
    const order = await db.order.create({
      data: {
        userId,
        productId: promo.productId,
        productSnapshot: {},
        type: 'PROMO_GRANT',
        status: 'PENDING',
        amount: 0,
        currency: 'usd',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    const payment = await db.payment.create({
      data: {
        orderId: order.id,
        userId,
        amount: 0,
        currency: 'usd',
        status: 'SUCCEEDED',
        paymentGateway: 'INTERNAL',
        isSubscription: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    await processFulfillmentByPayment(payment)

    await db.promoCodeRedemption.create({
      data: {
        promoCodeId: promo.id,
        userId,
        creditsGranted: 0,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    })

    await db.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } })

    return { success: true, message: 'redeemed product' }
  }

  return { success: false, message: 'unsupported grant type' }
}



