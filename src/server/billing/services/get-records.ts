import { db } from "@/server/db"
import type { GetRecordsParams, GetRecordsOutput, RecordSummary } from '../types'
import { TRPCError } from '@trpc/server'
import type { Prisma } from '@prisma/client'

export async function getRecords(params: GetRecordsParams): Promise<GetRecordsOutput> {
  if (!params.userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'userId is required' })

  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100)
  const offset = Math.max(params.offset ?? 0, 0)

  const where: Prisma.BillingRecordWhereInput = {
    userId: params.userId,
    ...(params.startTime !== undefined || params.endTime !== undefined
      ? {
          createdAt: {
            ...(params.startTime !== undefined ? { gte: params.startTime } : {}),
            ...(params.endTime !== undefined ? { lte: params.endTime } : {}),
          },
        }
      : {}),
    ...(params.accountType !== undefined ? { accountType: params.accountType } : {}),
  }

  const [total, records] = await db.$transaction([
    db.billingRecord.count({ where }),
    db.billingRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
  ])

  const summaries: RecordSummary[] = records.map((r) => ({
    id: r.id,
    accountType: r.accountType as RecordSummary['accountType'],
    subAccountType: r.subAccountType as RecordSummary['subAccountType'],
    operationType: r.operationType as RecordSummary['operationType'],
    amount: r.amount,
    businessId: r.businessId ?? null,
    businessType: (r.businessType as RecordSummary['businessType']) ?? null,
    referenceId: r.referenceId ?? null,
    description: r.description ?? null,
    status: r.status as RecordSummary['status'],
    createdAt: r.createdAt,
  }))

  return { records: summaries, total, hasMore: offset + records.length < total }
}


