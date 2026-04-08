import { db } from "@/server/db"
import { Prisma } from "@prisma/client"
import type { CreateSubscriptionCycleParams } from "../types"
import { upsertSubscriptionRenewalReminderSchedule } from "@/server/touch/services/upsert-subscription-renewal-reminder"

/**
 * Create a new subscription cycle with an auto-incremented sequence number.
 *
 * - sequenceNumber: 按 subscriptionId 维度，自增（1, 2, 3, ...）
 * - status: 新建周期一律为 ACTIVE，旧周期由上层逻辑负责标记为 CLOSED
 */
export async function createSubscriptionCycle(params: CreateSubscriptionCycleParams) {
  // Fast-path idempotency: if uniqueKey already exists, return it.
  if (params.uniqueKey) {
    const existing = await db.userSubscriptionCycle.findUnique({
      where: { uniqueKey: params.uniqueKey },
    })
    if (existing) return existing
  }

  const maxRetries = 3
  let lastErr: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const cycle = await db.$transaction(async (tx) => {
        // If another concurrent transaction inserted the same uniqueKey, return it.
        if (params.uniqueKey) {
          const existing = await tx.userSubscriptionCycle.findUnique({
            where: { uniqueKey: params.uniqueKey },
          })
          if (existing) return existing
        }

        // Find max sequenceNumber and create next cycle.
        const lastCycle = await tx.userSubscriptionCycle.findFirst({
          where: { subscriptionId: params.subscriptionId },
          orderBy: { sequenceNumber: "desc" },
          select: { sequenceNumber: true },
        })

        const nextSequence = (lastCycle?.sequenceNumber ?? 0) + 1

        return await tx.userSubscriptionCycle.create({
          data: {
            subscriptionId: params.subscriptionId,
            paymentId: params.paymentId,
            uniqueKey: params.uniqueKey,
            type: params.type,
            status: "ACTIVE",
            sequenceNumber: nextSequence,
            startsAt: params.startsAt,
            expiresAt: params.expiresAt,
          },
        })
      })

      // Best-effort: create/refresh renewal reminder schedule for this cycle
      // Do not block subscription cycle creation on touch system failures.
      try {
        await upsertSubscriptionRenewalReminderSchedule({ cycleId: cycle.id })
      } catch {
        // ignored
      }

      return cycle
    } catch (err) {
      lastErr = err

      // Idempotency uniqueKey collision: treat as already-created and return existing.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = (err.meta?.target ?? []) as unknown
        const targetStr = Array.isArray(target) ? target.join(",") : String(target)

        if (params.uniqueKey && targetStr.includes("unique_key")) {
          const existing = await db.userSubscriptionCycle.findUnique({
            where: { uniqueKey: params.uniqueKey },
          })
          if (existing) return existing
        }

        // Sequence collision under concurrency: retry.
        if (targetStr.includes("subscription_id") && targetStr.includes("sequence_number")) {
          continue
        }
      }

      throw err
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Failed to create subscription cycle")

}


