import { TRPCError } from '@trpc/server'
import { getVelobase } from '../velobase'
import type { BillingAccountType, BillingBusinessType, BillingSubAccountType } from '../types'

export type PostConsumeParams = {
  userId: string
  accountType?: BillingAccountType
  amount: number
  businessId: string
  businessType?: BillingBusinessType
  referenceId?: string
  description?: string
}

export type PostConsumeDetail = {
  accountId: string
  subAccountType: BillingSubAccountType
  amount: number
}

export type PostConsumeOutput = {
  totalAmount: number
  consumeDetails: PostConsumeDetail[]
  consumedAt: string
}

export async function postConsume(params: PostConsumeParams): Promise<PostConsumeOutput> {
  if (!params.userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'userId is required' })
  if (!params.businessId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'businessId is required' })
  if (!params.amount || params.amount <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'amount must be greater than 0' })

  const vb = getVelobase()

  // Velobase SDK 支持的 businessType 列表；ADMIN_DEDUCT 等不支持的类型会映射为 ADMIN_GRANT
  const sdkBusinessTypes = ['TASK', 'ORDER', 'MEMBERSHIP', 'SUBSCRIPTION', 'FREE_TRIAL', 'ADMIN_GRANT'] as const
  const businessTypeMap: Record<string, typeof sdkBusinessTypes[number]> = { ADMIN_DEDUCT: 'ADMIN_GRANT' }
  const raw = params.businessType
  const mapped = raw ? businessTypeMap[raw] : undefined
  const bt = mapped
    ?? (raw && sdkBusinessTypes.includes(raw as typeof sdkBusinessTypes[number])
      ? (raw as typeof sdkBusinessTypes[number])
      : undefined)

  const result = await vb.billing.deduct({
    customerId: params.userId,
    amount: params.amount,
    transactionId: params.businessId,
    businessType: bt,
    description: params.description ?? undefined,
  })

  const details = result.deductDetails as Array<{ accountId: string; creditType?: string; amount: number }>

  return {
    totalAmount: result.deductedAmount,
    consumeDetails: details.map((d) => ({
      accountId: d.accountId,
      subAccountType: (d.creditType ?? 'DEFAULT') as BillingSubAccountType,
      amount: d.amount,
    })),
    consumedAt: result.deductedAt,
  }
}
