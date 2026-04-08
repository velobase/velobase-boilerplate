export type NowPaymentsExtra = {
  payment_id?: string
  payment_status?: string
  pay_address?: string
  pay_amount?: number
  pay_currency?: string
  price_amount?: number
  price_currency?: string
  actually_paid?: number
  payin_hash?: string
  payout_hash?: string
  updated_at?: string
}

export type ProgressStep = {
  key: string
  title: string
  desc: string
  state: 'done' | 'active' | 'todo'
}

export function ceilToDecimals(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return value
  const d = Math.max(0, Math.floor(decimals))
  const factor = 10 ** d
  return Math.ceil((value + Number.EPSILON) * factor) / factor
}

