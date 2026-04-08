import type { BillingAccountType, BillingSubAccountType } from '../types'

export type AccountSnapshot = {
  id: string
  subAccountType: BillingSubAccountType
  availableAmount: number
  createdAt: Date
  startsAt: Date | null
  expiresAt: Date | null
}

export type DebitInstruction = {
  accountId: string
  amount: number
}

const creditConsumptionOrder: BillingSubAccountType[] = [
  'DAILY_LOGIN',
  'MEMBERSHIP',
  'PROMO_CODE',
  'FIRST_LOGIN',
  'ORDER',
  'FREE_TRIAL',
]

function sortAccountsByPriority(
  accountType: BillingAccountType,
  accounts: AccountSnapshot[],
) {
  const sorted = [...accounts]

  if (accountType === 'QUOTA') {
    sorted.sort((a, b) => {
      // 1) expiresAt ASC; null considered latest
      if (a.expiresAt && !b.expiresAt) return -1
      if (!a.expiresAt && b.expiresAt) return 1
      if (a.expiresAt && b.expiresAt) {
        if (a.expiresAt < b.expiresAt) return -1
        if (a.expiresAt > b.expiresAt) return 1
      }
      // 2) startsAt ASC; null after non-null
      if (!a.startsAt && b.startsAt) return 1
      if (a.startsAt && !b.startsAt) return -1
      if (a.startsAt && b.startsAt) {
        if (a.startsAt < b.startsAt) return -1
        if (a.startsAt > b.startsAt) return 1
      }
      // 3) createdAt ASC
      return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
    })
    return sorted
  }

  const priority: Record<string, number> = {}
  creditConsumptionOrder.forEach((sub, i) => (priority[sub] = i))

  sorted.sort((a, b) => {
    const p1 = priority[a.subAccountType] ?? 999
    const p2 = priority[b.subAccountType] ?? 999
    if (p1 !== p2) return p1 - p2

    // expiresAt ASC; null last
    if (a.expiresAt && !b.expiresAt) return -1
    if (!a.expiresAt && b.expiresAt) return 1
    if (a.expiresAt && b.expiresAt) {
      if (a.expiresAt < b.expiresAt) return -1
      if (a.expiresAt > b.expiresAt) return 1
    }

    // startsAt ASC; null after non-null
    if (!a.startsAt && b.startsAt) return 1
    if (a.startsAt && !b.startsAt) return -1
    if (a.startsAt && b.startsAt) {
      if (a.startsAt < b.startsAt) return -1
      if (a.startsAt > b.startsAt) return 1
    }

    // createdAt ASC
    return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  })

  return sorted
}

export function generateDebitInstructions(
  availableAccounts: AccountSnapshot[],
  amountToFreeze: number,
  accountType: BillingAccountType,
): DebitInstruction[] {
  if (amountToFreeze <= 0) {
    throw new Error('amountToFreeze must be greater than 0')
  }

  const totalAvailable = availableAccounts.reduce((s, a) => s + Math.max(0, a.availableAmount), 0)
  if (totalAvailable < amountToFreeze) {
    throw new Error('insufficient balance')
  }

  const sorted = sortAccountsByPriority(accountType, availableAccounts)

  const instructions: DebitInstruction[] = []
  let remaining = amountToFreeze

  for (const acc of sorted) {
    if (remaining <= 0) break
    if (acc.availableAmount <= 0) continue

    const take = Math.min(remaining, acc.availableAmount)
    instructions.push({ accountId: acc.id, amount: take })
    remaining -= take
  }

  const total = instructions.reduce((s, i) => s + i.amount, 0)
  if (total < amountToFreeze) {
    throw new Error('insufficient balance after instruction generation')
  }

  return instructions
}


