import { z } from "zod";
import { adminProcedure } from "@/server/api/trpc";
import type { Prisma } from "@prisma/client";
import { adminUpdateAffiliatePayoutRequest } from "@/server/affiliate/services/ledger";
import {
  adminForceMatureEarning,
  adminVoidEarning,
  adminRestoreEarning,
} from "@/server/affiliate/services/admin-actions";

export const listAffiliatePayoutRequests = adminProcedure
  .input(
    z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      type: z.enum(["all", "CASHOUT_USDT", "EXCHANGE_CREDITS"]).default("CASHOUT_USDT"),
      status: z
        .enum(["all", "REQUESTED", "APPROVED", "REJECTED", "COMPLETED", "FAILED"])
        .default("REQUESTED"),
      search: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { page, pageSize, type, status, search } = input;

    const where: Prisma.AffiliatePayoutRequestWhereInput = {};
    if (type !== "all") where.type = type;
    if (status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { affiliateUserId: { contains: search, mode: "insensitive" } },
        { walletAddress: { contains: search, mode: "insensitive" } },
        { affiliateUser: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const total = await ctx.db.affiliatePayoutRequest.count({ where });

    const items = await ctx.db.affiliatePayoutRequest.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        affiliateUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });

export const updateAffiliatePayoutRequest = adminProcedure
  .input(
    z.object({
      id: z.string(),
      action: z.enum(["APPROVE", "REJECT", "COMPLETE", "FAIL"]),
      txHash: z.string().optional(),
      adminNote: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    await adminUpdateAffiliatePayoutRequest({
      requestId: input.id,
      action: input.action,
      txHash: input.txHash ?? null,
      adminNote: input.adminNote ?? null,
    });
    return { success: true };
  });

export const listAffiliateCommissions = adminProcedure
  .input(
    z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      status: z.enum(["all", "PENDING", "AVAILABLE", "VOIDED"]).default("all"),
      search: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { page, pageSize, status, search } = input;

    const where: Prisma.AffiliateEarningWhereInput = {};
    if (status !== "all") {
      where.state = status;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { affiliateUser: { email: { contains: search, mode: "insensitive" } } },
        { referredUser: { email: { contains: search, mode: "insensitive" } } },
        { sourceExternalId: { contains: search, mode: "insensitive" } },
      ];
    }

    const total = await ctx.db.affiliateEarning.count({ where });

    const items = await ctx.db.affiliateEarning.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        affiliateUser: {
          select: { id: true, name: true, email: true },
        },
        referredUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });

export const updateAffiliateCommissionStatus = adminProcedure
  .input(
    z.object({
      id: z.string(),
      status: z.enum(["VOIDED", "AVAILABLE", "PENDING"]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const current = await ctx.db.affiliateEarning.findUnique({
      where: { id: input.id },
      select: {
        id: true,
        state: true,
      },
    });
    if (!current) throw new Error("Earning not found");

    const from = current.state;
    const to = input.status;

    if (from === to) return { success: true };

    if (from === "PENDING" && to === "AVAILABLE") {
      await adminForceMatureEarning(input.id);
    } else if ((from === "PENDING" || from === "AVAILABLE") && to === "VOIDED") {
      await adminVoidEarning(input.id);
    } else if (from === "VOIDED" && (to === "AVAILABLE" || to === "PENDING")) {
      await adminRestoreEarning(input.id, to);
    } else {
      throw new Error(`Invalid status transition: ${from} -> ${to}`);
    }

    return { success: true };
  });

