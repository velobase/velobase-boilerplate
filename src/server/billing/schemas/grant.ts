import { z } from "zod";
import {
  BillingAccountTypeSchema,
  BillingSubAccountTypeSchema,
  BillingBusinessTypeSchema,
} from "./shared";

export const GrantInputSchema = z.object({
  userId: z.string().min(1),
  accountType: BillingAccountTypeSchema,
  subAccountType: BillingSubAccountTypeSchema,
  amount: z.number().int().positive(),
  outerBizId: z.string().min(1),
  businessType: BillingBusinessTypeSchema.optional(),
  referenceId: z.string().optional(),
  description: z.string().optional(),
  startsAt: z.date().nullable().optional(),
  expiresAt: z.date().nullable().optional(),
});

export const GrantOutputSchema = z.object({
  accountId: z.string(),
  totalAmount: z.number(),
  addedAmount: z.number(),
  recordId: z.string(),
});

