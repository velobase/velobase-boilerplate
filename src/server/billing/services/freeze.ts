import { db } from "@/server/db"
import type { BillingBusinessType } from "@prisma/client"
import { TRPCError } from '@trpc/server'
import type { FreezeParams, FreezeOutput, FreezeDetail } from '../types'
import { generateDebitInstructions, type AccountSnapshot } from './generate-debit-instructions'

export async function freeze(params: FreezeParams): Promise<FreezeOutput> {
  if (!params.userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'userId is required' })
  if (!params.accountType) throw new TRPCError({ code: 'BAD_REQUEST', message: 'accountType is required' })
  if (!params.businessId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'businessId is required' })
  if (!params.businessType) throw new TRPCError({ code: 'BAD_REQUEST', message: 'businessType is required' })
  if (params.amount <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'amount must be greater than 0' })

  return await db.$transaction(async (tx) => {
    // Idempotency check
    const existing = await tx.billingFreezeRecord.findMany({
      where: { businessId: params.businessId, status: 'FROZEN' },
      orderBy: { createdAt: 'asc' },
    })
    if (existing.length > 0) {
      const details: FreezeDetail[] = existing.map((r) => ({
        freezeId: r.id,
        accountId: r.billingAccountId,
        accountType: r.accountType as FreezeDetail['accountType'],
        subAccountType: r.subAccountType as FreezeDetail['subAccountType'],
        amount: r.frozenAmount,
      }))
      return { totalAmount: details.reduce((s, d) => s + d.amount, 0), freezeDetails: details, isIdempotentReplay: true }
    }

    // Lock available accounts with positive available; emulate by selecting active accounts and checking amounts
    const now = new Date()
    const accounts = await tx.billingAccount.findMany({
      where: {
        userId: params.userId,
        accountType: params.accountType,
        status: 'ACTIVE',
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      orderBy: [{ createdAt: 'asc' }],
    })

    const snapshots: AccountSnapshot[] = accounts
      .map((a) => ({
        id: a.id,
        subAccountType: a.subAccountType as AccountSnapshot['subAccountType'],
        availableAmount: a.totalAmount - a.usedAmount - a.frozenAmount,
        createdAt: a.createdAt,
        startsAt: a.startsAt,
        expiresAt: a.expiresAt,
      }))
      .filter((s) => s.availableAmount > 0)

    if (params.targetAccountId !== undefined) {
      const target = snapshots.find((s) => s.id === params.targetAccountId)
      if (!target || target.availableAmount <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'insufficient balance or target not found' })
      if (target.availableAmount < params.amount) throw new TRPCError({ code: 'BAD_REQUEST', message: 'insufficient balance' })
      // Execute single debit
      const fr = await tx.billingFreezeRecord.create({
        data: {
          billingAccountId: target.id,
          userId: params.userId,
          accountType: params.accountType,
          subAccountType: target.subAccountType,
          businessId: params.businessId,
          businessType: params.businessType as BillingBusinessType,
          frozenAmount: params.amount,
          status: 'FROZEN',
        },
      })
      await tx.billingAccount.update({ where: { id: target.id }, data: { frozenAmount: { increment: params.amount } } })
      await tx.billingRecord.create({
        data: {
          billingAccountId: target.id,
          userId: params.userId,
          accountType: params.accountType,
          subAccountType: target.subAccountType,
          operationType: 'FREEZE',
          amount: params.amount,
          businessId: params.businessId,
          businessType: params.businessType as BillingBusinessType,
          status: 'COMPLETED',
          description: params.description ?? null,
        },
      })
      return {
        totalAmount: params.amount,
        freezeDetails: [
          {
            freezeId: fr.id,
            accountId: target.id,
            accountType: params.accountType,
            subAccountType: target.subAccountType,
            amount: params.amount,
          },
        ],
        isIdempotentReplay: false,
      }
    }

    // change-making mode
    const instructions = generateDebitInstructions(snapshots, params.amount, params.accountType)

    const details: FreezeDetail[] = []
    for (const ins of instructions) {
      const account = accounts.find((a) => a.id === ins.accountId)!
      const fr = await tx.billingFreezeRecord.create({
        data: {
          billingAccountId: ins.accountId,
          userId: params.userId,
          accountType: params.accountType,
          subAccountType: account.subAccountType,
          businessId: params.businessId,
          businessType: params.businessType as BillingBusinessType,
          frozenAmount: ins.amount,
          status: 'FROZEN',
        },
      })
      await tx.billingAccount.update({ where: { id: ins.accountId }, data: { frozenAmount: { increment: ins.amount } } })
      await tx.billingRecord.create({
        data: {
          billingAccountId: ins.accountId,
          userId: params.userId,
          accountType: params.accountType,
          subAccountType: account.subAccountType,
          operationType: 'FREEZE',
          amount: ins.amount,
          businessId: params.businessId,
          businessType: params.businessType as BillingBusinessType,
          status: 'COMPLETED',
          description: params.description ?? null,
        },
      })
      details.push({
        freezeId: fr.id,
        accountId: ins.accountId,
        accountType: params.accountType,
        subAccountType: account.subAccountType,
        amount: ins.amount,
      })
    }

    return { totalAmount: details.reduce((s, d) => s + d.amount, 0), freezeDetails: details, isIdempotentReplay: false }
  })
}


