import { db } from "@/server/db"
import { resolveClientCountryCode } from "@/server/lib/resolve-client-country"
import { getCurrencyForCountry, getProductPriceForCurrency } from "./get-price-for-currency"
import { formatPrice } from "../utils/format-price"
import type { Prisma } from "@prisma/client"

export interface GetProductParams {
  productId: string
  userId?: string           // From ctx.session, optional
  fallbackHeaders?: Headers // For anonymous users, use IP-based country detection
}

export interface GetProductResult {
  id: string
  name: string
  price: number
  originalPrice: number
  currency: string
  displayPrice: string         // Formatted with currency symbol, e.g. "£3.99"
  displayOriginalPrice: string // Formatted original price, e.g. "£7.99"
  type: string
  interval: string | null
  status: string
  isAvailable: boolean
  hasTrial: boolean
  trialDays: number | null
  trialCreditsAmount: number | null
  description: Prisma.JsonValue | null
  metadata: Prisma.JsonValue | null
  // Relations
  productSubscription: {
    id: string
    productId: string
    planId: string
    plan: {
      id: string
      type: string
      name: string
      status: string
      interval: string
      intervalCount: number
      creditsPerPeriod: number
      creditsPerMonth: number
      planEntitlements: unknown[]
    }
  } | null
  creditsPackage: {
    id: string
    productId: string
    creditsAmount: number
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
  } | null
  oneTimeEntitlements: unknown[]
  _count: { orders: number }
}

export async function getProduct(params: GetProductParams): Promise<GetProductResult> {
  const { productId, userId, fallbackHeaders } = params

  // 1. Fetch product base data
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      _count: { select: { orders: true } },
      productSubscription: { include: { plan: { include: { planEntitlements: true } } } },
      creditsPackage: true,
      oneTimeEntitlements: { include: { entitlement: true } },
    },
  })
  if (!product) throw new Error('Product not found')

  // 2. Determine country code
  let storedCountryCode: string | null = null
  
  if (userId) {
    // Logged in user: get country from database
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { countryCode: true },
    })
    storedCountryCode = user?.countryCode ?? null
  }

  // 3. Get currency for country
  const resolved = resolveClientCountryCode({
    headers: fallbackHeaders ?? null,
    storedCountryCode,
  })
  const currency = getCurrencyForCountry(resolved.countryCode)

  // 4. Get localized price
  const priceResult = await getProductPriceForCurrency(productId, currency)

  // 5. Format prices
  const displayPrice = formatPrice(priceResult.amount, { currency: priceResult.currency })
  const displayOriginalPrice = formatPrice(priceResult.originalAmount, { currency: priceResult.currency })

  // 6. Return enriched product
  return {
    id: product.id,
    name: product.name,
    price: priceResult.amount,
    originalPrice: priceResult.originalAmount,
    currency: priceResult.currency.toLowerCase(),
    displayPrice,
    displayOriginalPrice,
    type: product.type,
    interval: product.interval,
    status: product.status,
    isAvailable: product.isAvailable,
    hasTrial: product.hasTrial,
    trialDays: product.trialDays,
    trialCreditsAmount: product.trialCreditsAmount,
    description: product.description,
    metadata: product.metadata,
    productSubscription: product.productSubscription,
    creditsPackage: product.creditsPackage,
    oneTimeEntitlements: product.oneTimeEntitlements,
    _count: product._count,
  }
}


