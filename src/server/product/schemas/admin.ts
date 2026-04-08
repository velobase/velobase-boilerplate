import { z } from 'zod'

// Admin product creation schemas
export const adminCreateProductSubscriptionSchema = z.object({
  planType: z.enum(['FREE', 'PLUS', 'PREMIUM']),
  interval: z.enum(['WEEK', 'MONTH', 'YEAR']),
  creditsPerMonth: z.number().int().min(0),
})

export const adminCreateProductCreditsPackageSchema = z.object({
  creditsAmount: z.number().int().min(1),
})

export const adminCreateProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().int().min(0),
  originalPrice: z.number().int().min(0),
  currency: z.string().default('USD'),
  type: z.enum(['SUBSCRIPTION', 'CREDITS_PACKAGE']),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  subscription: adminCreateProductSubscriptionSchema.optional(),
  creditsPackage: adminCreateProductCreditsPackageSchema.optional(),
})

// Admin product update schema
export const adminUpdateProductSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().int().min(0).optional(),
  originalPrice: z.number().int().min(0).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  creditsPerMonth: z.number().int().min(0).optional(),
  creditsAmount: z.number().int().min(1).optional(),
})

// Admin product delete schema
export const adminDeleteProductSchema = z.object({
  productId: z.string().min(1),
})

// Admin product list schema
export const adminListProductsSchema = z.object({
  type: z.enum(['SUBSCRIPTION', 'CREDITS_PACKAGE']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

