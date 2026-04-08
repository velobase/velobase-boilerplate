import { z } from "zod";

export const ConsumeInputSchema = z.object({
  businessId: z.string().min(1),
  actualAmount: z.number().int().positive().optional(),  // Optional: actual amount to consume
});

export const ConsumeDetailSchema = z.object({
  freezeId: z.string(),
  accountId: z.string(),
  subAccountType: z.string(),
  amount: z.number(),
});

export const ConsumeOutputSchema = z.object({
  totalAmount: z.number(),
  returnedAmount: z.number().optional(),  // Amount returned if actualAmount < frozen
  consumeDetails: z.array(ConsumeDetailSchema),
  consumedAt: z.string(),
});

