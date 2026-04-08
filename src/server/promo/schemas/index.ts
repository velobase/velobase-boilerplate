import { z } from 'zod'

export const validateCodeSchema = z.object({
  code: z.string().min(1),
})

export const redeemCodeSchema = z.object({
  code: z.string().min(1),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})



