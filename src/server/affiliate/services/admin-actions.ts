/**
 * Admin actions for affiliate system
 * 独立文件避免 ledger.ts 过长
 */
import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";

type Tx = Prisma.TransactionClient;

async function lockUserRow(tx: Tx, userId: string) {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
}

async function getOrCreateAccount(tx: Tx, userId: string) {
  return tx.affiliateAccount.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: {
      id: true,
      userId: true,
      pendingCents: true,
      availableCents: true,
      lockedCents: true,
      debtCents: true,
      version: true,
    },
  });
}

/**
 * Admin 强制成熟单条 earning (PENDING -> AVAILABLE)
 * 同时更新 account 余额和创建 ledger entry
 */
export async function adminForceMatureEarning(earningId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const earning = await tx.affiliateEarning.findUnique({
      where: { id: earningId },
      select: {
        id: true,
        affiliateUserId: true,
        commissionCents: true,
        state: true,
      },
    });

    if (!earning) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Earning not found" });
    }

    if (earning.state !== "PENDING") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot force mature: current state is ${earning.state}, expected PENDING`,
      });
    }

    await lockUserRow(tx, earning.affiliateUserId);
    const account = await getOrCreateAccount(tx, earning.affiliateUserId);

    // 1. Update earning state
    await tx.affiliateEarning.update({
      where: { id: earningId },
      data: { state: "AVAILABLE" },
    });

    // 2. Create ledger entry (with idempotency)
    const idempotencyKey = `admin_force_mature:${earningId}`;
    try {
      await tx.affiliateLedgerEntry.create({
        data: {
          accountId: account.id,
          userId: earning.affiliateUserId,
          kind: "EARNING_MATURED",
          referenceType: "EARNING",
          referenceId: earningId,
          idempotencyKey,
          deltaPendingCents: -earning.commissionCents,
          deltaAvailableCents: +earning.commissionCents,
          deltaLockedCents: 0,
          deltaDebtCents: 0,
          meta: { adminForced: true },
        },
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        // Already processed (idempotent)
        return;
      }
      throw err;
    }

    // 3. Update account balances
    const nextPending = account.pendingCents - earning.commissionCents;
    const nextAvailable = account.availableCents + earning.commissionCents;

    if (nextPending < 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Pending balance would go negative",
      });
    }

    await tx.affiliateAccount.update({
      where: { id: account.id },
      data: {
        pendingCents: nextPending,
        availableCents: nextAvailable,
        version: { increment: 1 },
      },
    });
  });
}

/**
 * Admin 作废单条 earning (PENDING/AVAILABLE -> VOIDED)
 * 同时更新 account 余额和创建 ledger entry
 */
export async function adminVoidEarning(earningId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const earning = await tx.affiliateEarning.findUnique({
      where: { id: earningId },
      select: {
        id: true,
        affiliateUserId: true,
        commissionCents: true,
        state: true,
      },
    });

    if (!earning) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Earning not found" });
    }

    if (earning.state === "VOIDED") {
      return; // Already voided, idempotent
    }

    await lockUserRow(tx, earning.affiliateUserId);
    const account = await getOrCreateAccount(tx, earning.affiliateUserId);

    // 1. Update earning state
    await tx.affiliateEarning.update({
      where: { id: earningId },
      data: { state: "VOIDED" },
    });

    // 2. Determine which bucket to deduct from
    const fromPending = earning.state === "PENDING";
    const deltaPending = fromPending ? -earning.commissionCents : 0;
    const deltaAvailable = fromPending ? 0 : -earning.commissionCents;

    // 3. Create ledger entry
    const idempotencyKey = `admin_void:${earningId}`;
    try {
      await tx.affiliateLedgerEntry.create({
        data: {
          accountId: account.id,
          userId: earning.affiliateUserId,
          kind: "EARNING_VOIDED",
          referenceType: "EARNING",
          referenceId: earningId,
          idempotencyKey,
          deltaPendingCents: deltaPending,
          deltaAvailableCents: deltaAvailable,
          deltaLockedCents: 0,
          deltaDebtCents: 0,
          meta: { adminVoided: true, previousState: earning.state },
        },
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        return;
      }
      throw err;
    }

    // 4. Update account balances
    const nextPending = account.pendingCents + deltaPending;
    const nextAvailable = account.availableCents + deltaAvailable;

    if (nextPending < 0 || nextAvailable < 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Balance would go negative",
      });
    }

    await tx.affiliateAccount.update({
      where: { id: account.id },
      data: {
        pendingCents: nextPending,
        availableCents: nextAvailable,
        version: { increment: 1 },
      },
    });
  });
}

/**
 * Admin 恢复已作废的 earning (VOIDED -> AVAILABLE 或 VOIDED -> PENDING)
 */
export async function adminRestoreEarning(
  earningId: string,
  targetState: "AVAILABLE" | "PENDING"
): Promise<void> {
  await db.$transaction(async (tx) => {
    const earning = await tx.affiliateEarning.findUnique({
      where: { id: earningId },
      select: {
        id: true,
        affiliateUserId: true,
        commissionCents: true,
        state: true,
      },
    });

    if (!earning) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Earning not found" });
    }

    if (earning.state !== "VOIDED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot restore: current state is ${earning.state}, expected VOIDED`,
      });
    }

    await lockUserRow(tx, earning.affiliateUserId);
    const account = await getOrCreateAccount(tx, earning.affiliateUserId);

    // 1. Update earning state
    await tx.affiliateEarning.update({
      where: { id: earningId },
      data: { state: targetState },
    });

    // 2. Determine which bucket to add to
    const deltaPending = targetState === "PENDING" ? +earning.commissionCents : 0;
    const deltaAvailable = targetState === "AVAILABLE" ? +earning.commissionCents : 0;

    // 3. Create ledger entry
    const idempotencyKey = `admin_restore:${earningId}:${targetState}`;
    try {
      await tx.affiliateLedgerEntry.create({
        data: {
          accountId: account.id,
          userId: earning.affiliateUserId,
          kind: "EARNING_RESTORED",
          referenceType: "EARNING",
          referenceId: earningId,
          idempotencyKey,
          deltaPendingCents: deltaPending,
          deltaAvailableCents: deltaAvailable,
          deltaLockedCents: 0,
          deltaDebtCents: 0,
          meta: { adminRestored: true, targetState },
        },
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
        return;
      }
      throw err;
    }

    // 4. Update account balances
    await tx.affiliateAccount.update({
      where: { id: account.id },
      data: {
        pendingCents: account.pendingCents + deltaPending,
        availableCents: account.availableCents + deltaAvailable,
        version: { increment: 1 },
      },
    });
  });
}

