import { z } from "zod";
import { adminProcedure } from "@/server/api/trpc";
import { getBalance } from "@/server/billing/services/get-balance";
import { getRecords } from "@/server/billing/services/get-records";
import { grant } from "@/server/billing/services/grant";
import { postConsume } from "@/server/billing/services/post-consume";

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
      userId: z.string(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().nullish(),
      operationType: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const result = await getRecords({
      userId: input.userId,
      limit: input.limit,
      cursor: input.cursor ?? undefined,
      operationType: input.operationType ?? undefined,
    });

    return {
      items: result.records,
      nextCursor: result.nextCursor,
    };
  });

