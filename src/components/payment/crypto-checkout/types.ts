export type CryptoCurrency = {
  id: string
  name: string
  network: string
  symbol: string
  label: string
  badges?: Array<'popular' | 'low-fee' | 'fast' | 'high-fee'>
  logoUrl?: string
}

export type CryptoCheckoutPreview = {
  product: {
    id?: string
    name: string
    unitPrice: number
    interval?: 'WEEK' | 'MONTH' | 'YEAR'
  }
  priceBreakdown: {
    quantity?: number
    baseAmount: number
    tronSurchargeAmount: number
    tronSurchargeLabel?: string | null
    totalAmount: number
  }
  tronSurcharge?: {
    amount: number
    label?: string | null
  }
  minQuantity?: number
  minAmount: { usd: number; crypto?: number }
  isValid: boolean
  invalidReason?: string
}

export type CryptoEstimate = {
  estimatedAmount: number
  currencyTo: string
}

// 本地兜底 Top 1，页面秒开可操作（手机端显示友好）
export const FALLBACK_TOP_CURRENCIES: CryptoCurrency[] = [
  { id: 'usdtbsc', symbol: 'USDT', name: 'Tether', label: 'USDT (BSC)', network: 'BNB Smart Chain', badges: ['popular', 'low-fee'] },
]

export const TOP_CURRENCY_IDS = ['usdtbsc'] as const

