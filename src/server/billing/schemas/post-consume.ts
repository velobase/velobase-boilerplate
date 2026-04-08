import { z } from "zod";

export const PostConsumeInputSchema = z.object({
  userId: z.string().min(1),
  accountType: z.enum(['UNDEFINED','QUOTA','CREDIT']).optional(),
  amount: z.number().positive(),
  businessId: z.string().min(1),
  businessType: z.enum(['UNDEFINED','TASK','ORDER','MEMBERSHIP','SUBSCRIPTION','FREE_TRIAL','ADMIN_GRANT']).optional(),
  referenceId: z.string().optional(),
  description: z.string().optional(),
});

export const PostConsumeDetailSchema = z.object({
  accountId: z.string(),
  subAccountType: z.string(),
  amount: z.number(),
});

export const PostConsumeOutputSchema = z.object({
  totalAmount: z.number(),
  consumeDetails: z.array(PostConsumeDetailSchema),
  consumedAt: z.string(),
});


