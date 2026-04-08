import { z } from "zod";
import { BillingAccountTypeSchema, BillingSubAccountTypeSchema, BillingBusinessTypeSchema } from "./shared";

export const FreezeInputSchema = z.object({
  userId: z.string().min(1),
  accountType: BillingAccountTypeSchema,
  businessId: z.string().min(1),
  businessType: BillingBusinessTypeSchema,
  amount: z.number().int().positive(),
  targetAccountId: z.string().min(1).optional(),
  description: z.string().optional(),
});

const FreezeDetailSchema = z.object({
  freezeId: z.string(),
  accountId: z.string(),
  accountType: BillingAccountTypeSchema,
  subAccountType: BillingSubAccountTypeSchema,
  amount: z.number(),
});

export const FreezeOutputSchema = z.object({
  totalAmount: z.number(),
  freezeDetails: z.array(FreezeDetailSchema),
  isIdempotentReplay: z.boolean(),
});

