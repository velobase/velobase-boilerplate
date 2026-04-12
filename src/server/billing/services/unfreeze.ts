import { TRPCError } from '@trpc/server'
import { getVelobase } from '../velobase'
import type { UnfreezeParams, UnfreezeOutput } from '../types'

export async function unfreeze(params: UnfreezeParams): Promise<UnfreezeOutput> {
  if (!params.businessId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'businessId is required' })

  const vb = getVelobase()

  const result = await vb.billing.unfreeze({
    transactionId: params.businessId,
  })

  const details = result.unfreezeDetails as Array<{ accountId: string; creditType?: string; amount: number }>

  return {
    totalAmount: result.unfrozenAmount,
    unfreezeDetails: details.map((d) => ({
      freezeId: params.businessId,
      accountId: d.accountId,
      subAccountType: (d.creditType ?? 'DEFAULT') as UnfreezeOutput['unfreezeDetails'][number]['subAccountType'],
      amount: d.amount,
    })),
    unfrozenAt: result.unfrozenAt,
  }
}
