import { db } from "@/server/db"
import { Prisma } from "@prisma/client"
import type { BillingBusinessType } from "@prisma/client"
import { TRPCError } from '@trpc/server'
import type { GrantParams, GrantOutput } from '../types'

type TxClient = Prisma.TransactionClient

export async function grant(params: GrantParams, tx?: TxClient): Promise<GrantOutput> {
  if (!params.userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'userId is required' })
  if (!params.accountType || !params.subAccountType) throw new TRPCError({ code: 'BAD_REQUEST', message: 'accountType and subAccountType are required' })
  if (!params.outerBizId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'outerBizId is required' })
  if (params.amount <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'amount must be greater than 0' })

  function hash32(input: string): number {
    // FNV-1a 32-bit
    let h = 0x811c9dc5
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    return h | 0
  }

  async function grantInTx(client: TxClient): Promise<GrantOutput> {
    // Serialize by outerBizId so we don't:
    // - hit P2002 on BillingAccount.outerBizId
    // - create duplicate GRANT records for the same outerBizId
    const lockNamespace = 0x4752414e // 'GRAN' (namespace for grant locks)
    const lockKey = hash32(params.outerBizId)
    // pg_advisory_xact_lock has signature (int4, int4) or (int8); Prisma binds params as int8 by default,
    // so we cast explicitly to int4 to avoid "function ... (bigint, bigint) does not exist".
    await client.$executeRaw`SELECT pg_advisory_xact_lock(${lockNamespace}::int4, ${lockKey}::int4)`

    // idempotency: if account with same outerBizId exists, return existing
    const existing = await client.billingAccount.findUnique({ where: { outerBizId: params.outerBizId } })
    if (existing) {
      const record = await client.billingRecord.findFirst({
        where: {
          billingAccountId: existing.id,
          operationType: 'GRANT',
        },
      })
      if (!record) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'inconsistent grant record' })
      return {
        accountId: existing.id,
        totalAmount: existing.totalAmount,
        addedAmount: record.amount,
        recordId: record.id,
      }
    }

    const account = await client.billingAccount.create({
      data: {
        userId: params.userId,
        accountType: params.accountType,
        subAccountType: params.subAccountType,
        outerBizId: params.outerBizId,
        referenceId: params.referenceId ?? null,
        totalAmount: params.amount,
        usedAmount: 0,
        frozenAmount: 0,
        status: params.status ?? 'ACTIVE',
        startsAt: params.startsAt ?? null,
        expiresAt: params.expiresAt ?? null,
      },
    })

    const record = await client.billingRecord.create({
      data: {
        billingAccountId: account.id,
        userId: params.userId,
        accountType: params.accountType,
        subAccountType: params.subAccountType,
        operationType: 'GRANT',
        amount: params.amount,
        businessId: params.outerBizId,
        businessType: (params.businessType ?? 'UNDEFINED') as BillingBusinessType,
        referenceId: params.referenceId ?? null,
        description: params.description ?? null,
        status: 'COMPLETED',
      },
    })

    return {
      accountId: account.id,
      totalAmount: account.totalAmount,
      addedAmount: params.amount,
      recordId: record.id,
    }
  }

  try {
    // If called inside an outer transaction, reuse it to allow atomic higher-level workflows (e.g. promo redemption).
    if (tx) {
      return await grantInTx(tx)
    }

    return await db.$transaction(async (tx2) => grantInTx(tx2))
  } catch (err) {
    // Concurrency: another process granted the same outerBizId between our initial check and transaction create.
    // Treat as idempotent and return existing.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // IMPORTANT:
      // If `tx` was provided, the surrounding interactive transaction is already in a failed state.
      // Never attempt to query using that `tx` here, or it will throw a second error and hide the root cause.
      if (tx) throw err

      const existingAfter = await db.billingAccount.findUnique({ where: { outerBizId: params.outerBizId } })
      if (!existingAfter) throw err

      const record = await db.billingRecord.findFirst({
        where: {
          billingAccountId: existingAfter.id,
          operationType: 'GRANT',
        },
      })
      if (!record) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'inconsistent grant record' })

      return {
        accountId: existingAfter.id,
        totalAmount: existingAfter.totalAmount,
        addedAmount: record.amount,
        recordId: record.id,
      }
    }
    throw err
  }
}


