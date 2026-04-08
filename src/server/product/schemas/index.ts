import { z } from 'zod'

// Input Schemas
export const getProductSchema = z.object({
  productId: z.string().min(1),
})

export const listProductsSchema = z.object({
  type: z.enum(['UNDEFINED', 'SUBSCRIPTION', 'ONE_TIME_ENTITLEMENT', 'CREDITS_PACKAGE']).optional(),
  // Optional: exact product id selection (stable ids). If provided, server returns only these products.
  // We keep this in the base schema so listForPricing can reuse it.
  productIds: z.array(z.string().min(1)).min(1).max(50).optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
})

export const hitPaywallSchema = z.object({
  source: z.string().min(1),
  variant: z.string().min(1).optional(),
})

// Output Schemas
const SubscriptionPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  interval: z.enum(['WEEK', 'MONTH', 'YEAR']),
  creditsPerMonth: z.number(),
})

const ProductSubscriptionSchema = z.object({
  id: z.string(),
  planId: z.string(),
  plan: SubscriptionPlanSchema,
})

const ProductCreditsPackageSchema = z.object({
  id: z.string(),
  creditsAmount: z.number(),
})

const EntitlementSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  type: z.string(),
})

const ProductOneTimeEntitlementSchema = z.object({
  id: z.string(),
  entitlementId: z.string(),
  value: z.unknown(),
  durationDays: z.number(),
  entitlement: EntitlementSchema,
})

export const ProductItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.unknown().nullable(),
  price: z.number(),
  originalPrice: z.number(),
  displayPrice: z.string(),
  currency: z.string(),
  type: z.enum(['UNDEFINED', 'SUBSCRIPTION', 'ONE_TIME_ENTITLEMENT', 'CREDITS_PACKAGE']),
  interval: z.string().nullable().optional(),
  status: z.enum(['UNDEFINED', 'ACTIVE', 'INACTIVE']),
  isAvailable: z.boolean(),
  sortOrder: z.number(),
  
  // Calculated fields
  discount: z.number().optional(),
  
  // Subscription specific
  creditsPerMonth: z.number().optional(),
  features: z.array(z.string()).optional(),
  
  // Credits package specific
  creditsAmount: z.number().optional(),
  unitPrice: z.string().optional(),
  
  // User specific (only when logged in)
  isPurchasable: z.boolean().optional(),
  userStatus: z.object({
    hasActiveSubscription: z.boolean(),
    currentBalance: z.number(),
  }).optional(),
  
  // Relations (raw data)
  productSubscription: ProductSubscriptionSchema.nullable().optional(),
  creditsPackage: ProductCreditsPackageSchema.nullable().optional(),
  oneTimeEntitlements: z.array(ProductOneTimeEntitlementSchema).optional(),

  // Purchase mode for UI: NEW / UPGRADE / DISABLED
  purchaseMode: z.enum(['NEW', 'UPGRADE', 'DISABLED']).optional(),
})

export const ListProductsOutputSchema = z.object({
  products: z.array(ProductItemSchema),
  total: z.number(),
  hasMore: z.boolean(),
})


