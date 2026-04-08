/**
 * Telegram Stars pricing configuration.
 *
 * Maps product IDs to Stars prices.
 * Telegram Stars exchange rate: ~1 Star ≈ $0.02 USD (as of 2025).
 *
 * We store explicit Stars amounts per product to avoid floating-point issues
 * and to allow manual price adjustments independent of the exchange rate.
 *
 * If a product is not in this map, we fall back to computing from USD price:
 *   stars = Math.ceil(priceInCents / 2)   // $0.02 per star → 1 cent = 0.5 stars
 */

/** Explicit product → stars price overrides */
const PRODUCT_STARS_PRICE: Record<string, number> = {
  // Add explicit overrides here, e.g.:
  // "product-id-for-100-credits": 250,  // $4.99 → 250 stars
};

/**
 * Get the Stars price for a product.
 * @param productId - The product ID
 * @param priceInCents - The USD price in cents (fallback calculation)
 * @returns Stars amount
 */
export function getStarsPrice(productId: string, priceInCents: number): number {
  // Check explicit override first
  const override = PRODUCT_STARS_PRICE[productId];
  if (typeof override === "number" && override > 0) return override;

  // Fallback: convert USD cents to Stars
  // 1 Star ≈ $0.02 USD → 1 cent = 0.5 stars → stars = cents / 2
  // Use ceil to ensure we don't undercharge
  return Math.ceil(priceInCents / 2);
}

/**
 * Convert Stars amount back to approximate USD cents (for display/logging).
 */
export function starsToUsdCents(stars: number): number {
  return stars * 2;
}
