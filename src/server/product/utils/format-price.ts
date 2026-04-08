/**
 * Format price utilities for product display
 */

interface FormatPriceOptions {
  currency?: string
  locale?: string
}

/**
 * Format price from cents to display string
 * @param cents - Price in cents (e.g., 2000 = $20.00)
 * @param options - Formatting options
 * @returns Formatted price string (e.g., "$20.00")
 */
export function formatPrice(cents: number, options: FormatPriceOptions = {}): string {
  const { currency = 'usd', locale = 'en-US' } = options
  
  const amount = cents / 100
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format subscription price with period
 * @param cents - Price in cents
 * @param interval - Subscription interval (month/year)
 * @param options - Formatting options
 * @returns Formatted price with period (e.g., "$20/month" or "$16.67/month")
 */
export function formatSubscriptionPrice(
  cents: number,
  interval: string,
  options: FormatPriceOptions = {}
): string {
  const { currency = 'usd', locale = 'en-US' } = options
  
  // For yearly subscriptions, show monthly equivalent
  let displayAmount = cents / 100
  let period = 'month'
  
  if (interval?.toLowerCase() === 'year') {
    displayAmount = cents / 1200 // Divide by 12 months
    period = 'month'
  } else if (interval?.toLowerCase() === 'month') {
    period = 'month'
  }
  
  const priceStr = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(displayAmount)
  
  return `${priceStr}/${period}`
}

/**
 * Calculate discount percentage
 * @param originalPrice - Original price in cents
 * @param currentPrice - Current price in cents
 * @returns Discount percentage (0-100)
 */
export function calculateDiscount(originalPrice: number, currentPrice: number): number {
  if (originalPrice <= 0 || currentPrice >= originalPrice) {
    return 0
  }
  
  const discount = ((originalPrice - currentPrice) / originalPrice) * 100
  return Math.round(discount)
}

/**
 * Calculate unit price for credits package
 * @param totalPrice - Total price in cents
 * @param credits - Number of credits
 * @param options - Formatting options
 * @returns Formatted unit price (e.g., "$0.83/1000 credits")
 */
export function formatUnitPrice(
  totalPrice: number,
  credits: number,
  options: FormatPriceOptions = {}
): string {
  const { currency = 'usd', locale = 'en-US' } = options
  
  if (credits <= 0) {
    return 'N/A'
  }
  
  // Calculate price per 1000 credits
  const pricePerThousand = (totalPrice / credits) * 1000 / 100
  
  const priceStr = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pricePerThousand)
  
  return `${priceStr}/1K credits`
}

/**
 * Extract features from subscription plan
 * @param plan - Subscription plan data
 * @returns Array of feature strings
 */
export function extractPlanFeatures(plan: {
  creditsPerMonth?: number
  planEntitlements?: Array<{
    entitlement: {
      name: string
      key: string
    }
    value: unknown
  }>
}): string[] {
  const features: string[] = []
  
  // Add credits info
  if (plan.creditsPerMonth && plan.creditsPerMonth > 0) {
    const creditsFormatted = new Intl.NumberFormat('en-US').format(plan.creditsPerMonth)
    features.push(`${creditsFormatted} credits/month`)
  }
  
  // Add entitlements
  if (plan.planEntitlements && plan.planEntitlements.length > 0) {
    plan.planEntitlements.forEach((pe) => {
      const { entitlement, value } = pe
      
      if (entitlement.key === 'gpt4_access' && value) {
        features.push('GPT-4 Access')
      } else if (entitlement.key === 'priority_support' && value) {
        features.push('Priority Support')
      } else if (entitlement.key === 'api_access' && value) {
        features.push('API Access')
      } else {
        // Generic entitlement display
        features.push(entitlement.name)
      }
    })
  }
  
  return features
}

