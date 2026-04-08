/**
 * Client-side price formatting utilities
 * 
 * IMPORTANT: Prefer using server-returned `displayPrice` whenever possible.
 * Only use these functions when you need to dynamically calculate prices on the client.
 */

export interface FormatPriceOptions {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format price from cents to display string with currency symbol
 * 
 * @example
 * formatPrice(1999, 'USD') // "$19.99"
 * formatPrice(1599, 'GBP') // "£15.99"
 * formatPrice(1899, 'EUR') // "€18.99"
 */
export function formatPrice(
  cents: number,
  currency: string,
  options: FormatPriceOptions = {}
): string {
  const {
    locale = 'en-US',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(cents / 100);
}

/**
 * Get currency symbol for a given currency code
 * 
 * @example
 * getCurrencySymbol('USD') // "$"
 * getCurrencySymbol('GBP') // "£"
 * getCurrencySymbol('EUR') // "€"
 */
export function getCurrencySymbol(currency: string, locale = 'en-US'): string {
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).formatToParts(0);
  
  return parts.find(p => p.type === 'currency')?.value ?? '$';
}

/**
 * Format price with period suffix
 * 
 * @example
 * formatPriceWithPeriod(1999, 'USD', 'month') // "$19.99/month"
 * formatPriceWithPeriod(1599, 'GBP', 'week') // "£15.99/week"
 */
export function formatPriceWithPeriod(
  cents: number,
  currency: string,
  period: 'month' | 'week' | 'year',
  options: FormatPriceOptions = {}
): string {
  const priceStr = formatPrice(cents, currency, options);
  return `${priceStr}/${period}`;
}

