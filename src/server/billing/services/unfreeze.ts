import { db } from "@/server/db"
import { TRPCError } from '@trpc/server'
import type { UnfreezeParams, UnfreezeOutput, UnfreezeDetail } from '../types'

export async function unfreeze(params: UnfreezeParams): Promise<UnfreezeOutput> {
  if (!params.businessId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'businessId is required' })

  return await db.$transaction(async (tx) => {
    const freezeRecords = await tx.billingFreezeRecord.findMany({
      where: { businessId: params.businessId, status: 'FROZEN' },
      orderBy: { createdAt: 'asc' },
    })

    if (freezeRecords.length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'no unfreezable records found' })
    }

    const details: UnfreezeDetail[] = []
    let total = 0
    let unfrozenAt = ''

    for (let i = 0; i < freezeRecords.length; i++) {
      const fr = freezeRecords[i]!

      await tx.billingAccount.update({
        where: { id: fr.billingAccountId },
        data: { frozenAmount: { decrement: fr.frozenAmount } },
      })

      await tx.billingFreezeRecord.update({ where: { id: fr.id }, data: { status: 'UNFROZEN' } })

      const record = await tx.billingRecord.create({
        data: {
          billingAccountId: fr.billingAccountId,
          userId: fr.userId,
          accountType: fr.accountType,
          subAccountType: fr.subAccountType,
          operationType: 'UNFREEZE',
          amount: fr.frozenAmount,
          businessId: params.businessId,
          businessType: fr.businessType,
          status: 'COMPLETED',
        },
      })

      details.push({
        freezeId: fr.id,
        accountId: fr.billingAccountId,
        subAccountType: fr.subAccountType,
        amount: fr.frozenAmount,
      })
      total += fr.frozenAmount
      if (i === 0) unfrozenAt = record.createdAt.toISOString()
    }

    return { totalAmount: total, unfreezeDetails: details, unfrozenAt }
  })
}


