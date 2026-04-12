import { TRPCError } from '@trpc/server'
import { getVelobase } from '../velobase'
import { VelobaseNotFoundError } from '@velobaseai/billing'
import type { GetRecordsParams, GetRecordsOutput, RecordSummary } from '../types'

export async function getRecords(params: GetRecordsParams): Promise<GetRecordsOutput> {
  if (!params.userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'userId is required' })

  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100)
  const vb = getVelobase()

  try {
    const res = await vb.customers.ledger(params.userId, {
      limit,
      cursor: params.cursor ?? undefined,
      operationType: params.operationType ?? undefined,
      transactionId: params.transactionId ?? undefined,
    })

    const summaries: RecordSummary[] = res.items.map((entry) => ({
      id: entry.id,
      operationType: entry.operationType as RecordSummary['operationType'],
      amount: entry.amount,
      creditType: entry.creditType,
      transactionId: entry.transactionId ?? null,
      businessType: (entry.businessType as RecordSummary['businessType']) ?? null,
      description: entry.description ?? null,
      accountId: entry.accountId,
      status: entry.status as RecordSummary['status'],
      createdAt: new Date(entry.createdAt),
    }))

    return {
      records: summaries,
      total: res.totalCount,
      hasMore: res.hasMore,
      nextCursor: res.nextCursor ?? undefined,
    }
  } catch (err) {
    if (err instanceof VelobaseNotFoundError) {
      return { records: [], total: 0, hasMore: false }
    }
    throw err
  }
}
