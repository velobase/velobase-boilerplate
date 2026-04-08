import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const jsonValueSchema: z.ZodType<Prisma.JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
);

export const CreateSubscriptionParamsSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  planSnapshot: jsonValueSchema,
  gateway: z.string().min(1),
  gatewaySubscriptionId: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
})

export const CreateSubscriptionCycleParamsSchema = z.object({
  subscriptionId: z.string().min(1),
  paymentId: z.string().optional(),
  uniqueKey: z.string().min(1).optional(),
  type: z.enum(['UNDEFINED', 'REGULAR', 'TRIAL']),
  startsAt: z.date(),
  expiresAt: z.date(),
})

export const GetSubscriptionStatusParamsSchema = z.object({
  userId: z.string().min(1),
})


