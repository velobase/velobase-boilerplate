import { db } from "@/server/db"
import { TRPCError } from '@trpc/server'
import type { ConsumeParams, ConsumeOutput, ConsumeDetail } from '../types'

/**
 * Consume frozen credits (partial or full)
 * 
 * @param params.businessId - Business ID to identify freeze records
 * @param params.actualAmount - Actual amount to consume (optional, defaults to full frozen amount)
 * 
 * If actualAmount < total frozen: automatically returns the difference (multi-refund)
 * If actualAmount > total frozen: throws error (overage not supported, freeze enough upfront)
 */
export async function consume(params: ConsumeParams): Promise<ConsumeOutput> {
  if (!params.businessId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'businessId is required' })

  return await db.$transaction(async (tx) => {
    const freezeRecords = await tx.billingFreezeRecord.findMany({
      where: { businessId: params.businessId, status: 'FROZEN' },
      orderBy: { createdAt: 'asc' },
    })

    if (freezeRecords.length === 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'no consumable freeze records found' })
    }

    // Calculate total frozen amount
    const totalFrozen = freezeRecords.reduce((sum, fr) => sum + fr.frozenAmount, 0)
    
    // Determine actual consumption amount (default: all frozen)
    const actualAmount: number = params.actualAmount ?? totalFrozen
    
    // Validate: do not support overage (must freeze enough upfront)
    if (actualAmount > totalFrozen) {
      throw new TRPCError({ 
        code: 'BAD_REQUEST', 
        message: `Actual amount (${actualAmount}) exceeds frozen amount (${totalFrozen}). Please freeze sufficient credits upfront.` 
      })
    }

    const details: ConsumeDetail[] = []
    let consumedSoFar = 0
    let returnedSoFar = 0
    let consumedAt = ''

    // Process each freeze record in FEFO order
    for (const fr of freezeRecords) {
      
      // Calculate how much to consume from this record
      const needConsume = Math.min(fr.frozenAmount, actualAmount - consumedSoFar)
      const needReturn = fr.frozenAmount - needConsume

      // Update account: unfreeze all, consume only needConsume
      await tx.billingAccount.update({
        where: { id: fr.billingAccountId },
        data: {
          frozenAmount: { decrement: fr.frozenAmount },  // Unfreeze all from this record
          usedAmount: { increment: needConsume },         // Only consume actual usage
        },
      })

      // Update freeze record status: consumed if any usage, otherwise unfrozen
      await tx.billingFreezeRecord.update({ 
        where: { id: fr.id }, 
        data: { status: needConsume > 0 ? 'CONSUMED' : 'UNFROZEN' } 
      })

      // Create CONSUME billing record (for actual usage)
      if (needConsume > 0) {
        const consumeRecord = await tx.billingRecord.create({
          data: {
            billingAccountId: fr.billingAccountId,
            userId: fr.userId,
            accountType: fr.accountType,
            subAccountType: fr.subAccountType,
            operationType: 'CONSUME',
            amount: needConsume,
            businessId: params.businessId,
            businessType: fr.businessType,
            status: 'COMPLETED',
            description: params.actualAmount !== undefined 
              ? `Partial consume: ${needConsume} of ${fr.frozenAmount} frozen`
              : null,
          },
        })
        
        // Set consumedAt when the first consumption happens
        if (!consumedAt) consumedAt = consumeRecord.createdAt.toISOString()
      }

      // Create UNFREEZE billing record (for returned amount)
      if (needReturn > 0) {
        await tx.billingRecord.create({
          data: {
            billingAccountId: fr.billingAccountId,
            userId: fr.userId,
            accountType: fr.accountType,
            subAccountType: fr.subAccountType,
            operationType: 'UNFREEZE',
            amount: needReturn,
            businessId: params.businessId,
            businessType: fr.businessType,
            status: 'COMPLETED',
            description: `Returned unused credits: ${needReturn} of ${fr.frozenAmount} frozen`,
          },
        })
        
        returnedSoFar += needReturn
      }

      // Only include entries that actually consumed credits
      if (needConsume > 0) {
        details.push({
          freezeId: fr.id,
          accountId: fr.billingAccountId,
          subAccountType: fr.subAccountType,
          amount: needConsume,
        })
      }
      
      consumedSoFar += needConsume
      
      // Do not break here; continue to process remaining records to unfreeze leftovers
    }

    return { 
      totalAmount: actualAmount, 
      returnedAmount: returnedSoFar > 0 ? returnedSoFar : undefined,
      consumeDetails: details, 
      consumedAt 
    }
  })
}


