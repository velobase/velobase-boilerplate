import { db } from "@/server/db"
import type { BillingBusinessType as PrismaBillingBusinessType } from "@prisma/client"
import { TRPCError } from "@trpc/server"
import { generateDebitInstructions, type AccountSnapshot } from "./generate-debit-instructions"
import type { BillingAccountType, BillingBusinessType, BillingSubAccountType } from "../types"

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

  const accountType: BillingAccountType = params.accountType ?? 'CREDIT'

  // Idempotency: if we already consumed for this businessId, return the summary
  const existing = await db.billingRecord.findMany({
    where: { userId: params.userId, operationType: 'CONSUME', businessId: params.businessId },
    orderBy: { createdAt: 'asc' },
  })
  if (existing.length > 0) {
    const total = existing.reduce((s, r) => s + r.amount, 0)
    return {
      totalAmount: total,
      consumeDetails: existing.map((r) => ({
        accountId: r.billingAccountId,
        subAccountType: r.subAccountType as BillingSubAccountType,
        amount: r.amount,
      })),
      consumedAt: existing[0]!.createdAt.toISOString(),
    }
  }

  return await db.$transaction(async (tx) => {
    // Load all active accounts and compute available amounts
    const now = new Date()
    const accounts = await tx.billingAccount.findMany({
      where: { userId: params.userId, accountType, status: 'ACTIVE' },
      orderBy: [{ createdAt: 'asc' }],
    })

    const snapshots: AccountSnapshot[] = accounts.map((a) => ({
      id: a.id,
      subAccountType: a.subAccountType as BillingSubAccountType,
      availableAmount: Math.max(0, a.totalAmount - a.usedAmount - a.frozenAmount),
      createdAt: a.createdAt,
      startsAt: a.startsAt,
      expiresAt: a.expiresAt,
    })).filter((s) => s.availableAmount > 0 && (!accounts.find((a) => a.id === s.id)!.startsAt || now >= accounts.find((a) => a.id === s.id)!.startsAt!) && (!accounts.find((a) => a.id === s.id)!.expiresAt || now <= accounts.find((a) => a.id === s.id)!.expiresAt!))

    if (snapshots.length === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'insufficient balance' })

    // Build debit plan using FEFO/priority ordering
    const instructions = generateDebitInstructions(snapshots, params.amount, accountType)

    const details: PostConsumeDetail[] = []
    let total = 0
    let consumedAt = ''

    for (let i = 0; i < instructions.length; i++) {
      const ins = instructions[i]!

      // Update account usage
      const updated = await tx.billingAccount.update({
        where: { id: ins.accountId },
        data: {
          usedAmount: { increment: ins.amount },
        },
      })

      const record = await tx.billingRecord.create({
        data: {
          billingAccountId: ins.accountId,
          userId: params.userId,
          accountType,
          subAccountType: updated.subAccountType as BillingSubAccountType,
          operationType: 'CONSUME',
          amount: ins.amount,
          businessId: params.businessId,
          businessType: (params.businessType ?? 'UNDEFINED') as PrismaBillingBusinessType,
          referenceId: params.referenceId ?? null,
          description: params.description ?? null,
          status: 'COMPLETED',
        },
      })

      details.push({ accountId: ins.accountId, subAccountType: updated.subAccountType as BillingSubAccountType, amount: ins.amount })
      total += ins.amount
      if (i === 0) consumedAt = record.createdAt.toISOString()
    }

    return { totalAmount: total, consumeDetails: details, consumedAt }
  })
}


