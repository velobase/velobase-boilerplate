import { z } from "zod";
import { BillingAccountTypeSchema } from "./shared";

export const GetBalanceInputSchema = z.object({
  userId: z.string().min(1),
  accountType: BillingAccountTypeSchema.optional(),
});

const AccountSummarySchema = z.object({
  accountType: BillingAccountTypeSchema,
  subAccountType: z.string(),
  total: z.number(),
  used: z.number(),
  frozen: z.number(),
  available: z.number(),
  startsAt: z.date().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
});

export const GetBalanceOutputSchema = z.object({
  totalSummary: z.object({
    total: z.number(),
    used: z.number(),
    frozen: z.number(),
    available: z.number(),
  }),
  accounts: z.array(AccountSummarySchema),
});

