import { z } from "zod";
import { BillingAccountTypeSchema } from "./shared";

export const GetRecordsInputSchema = z.object({
  userId: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  accountType: BillingAccountTypeSchema.optional(),
});

const RecordSummarySchema = z.object({
  id: z.string(),
  accountType: BillingAccountTypeSchema,
  subAccountType: z.string(),
  operationType: z.string(),
  amount: z.number(),
  businessId: z.string().nullable().optional(),
  businessType: z.string().nullable().optional(),
  referenceId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.date(),
});

export const GetRecordsOutputSchema = z.object({
  records: z.array(RecordSummarySchema),
  total: z.number(),
  hasMore: z.boolean(),
});

