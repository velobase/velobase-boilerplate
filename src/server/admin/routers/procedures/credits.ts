import { z } from "zod";
import { adminProcedure } from "@/server/api/trpc";
import { getBalance } from "@/server/billing/services/get-balance";
import { grant } from "@/server/billing/services/grant";
import { postConsume } from "@/server/billing/services/post-consume";
import type { Prisma, BillingOperationType } from "@prisma/client";

export const getUserCredits = adminProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ input }) => {
    return getBalance({ userId: input.userId, accountType: "CREDIT" });
  });

export const grantCredits = adminProcedure
  .input(
    z.object({
      userId: z.string(),
      amount: z.number().int().positive().max(100000),
      reason: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    await grant({
      userId: input.userId,
      accountType: "CREDIT",
      subAccountType: "DEFAULT",
      amount: input.amount,
      outerBizId: `admin_grant_${input.userId}_${Date.now()}`,
      businessType: "ADMIN_GRANT",
      description: input.reason || "Admin manual grant",
    });
    return { success: true };
  });

export const deductCredits = adminProcedure
  .input(
    z.object({
      userId: z.string(),
      amount: z.number().int().positive().max(100000),
      reason: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    await postConsume({
      userId: input.userId,
      accountType: "CREDIT",
      amount: input.amount,
      businessId: `admin_deduct_${input.userId}_${Date.now()}`,
      businessType: "ADMIN_DEDUCT",
      description: input.reason || "Admin manual deduction",
    });
    return { success: true };
  });

export const listBillingRecords = adminProcedure
  .input(
    z.object({
      userId: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().nullish(),
      operationTypes: z.array(z.string()).optional(),
      operationType: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const limit = input.limit;
    const { cursor, userId, operationTypes, operationType } = input;

    const where: Prisma.BillingRecordWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (operationTypes && operationTypes.length > 0) {
      where.operationType = {
        in: operationTypes as BillingOperationType[],
      };
    } else if (operationType) {
      where.operationType = operationType as BillingOperationType;
    }

    const items = await ctx.db.billingRecord.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      where,
      include: {
        account: {
          select: {
            userId: true,
          },
        },
      },
    });

    let nextCursor: typeof cursor | undefined = undefined;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem!.id;
    }

    return {
      items,
      nextCursor,
    };
  });

