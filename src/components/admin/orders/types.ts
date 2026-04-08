export type FilterStatus = "all" | "PENDING" | "COMPLETED" | "CANCELLED" | "EXPIRED"
export type FilterType = "all" | "NEW_PURCHASE" | "RENEWAL" | "UPGRADE"

export interface Filters {
  status: FilterStatus
  type: FilterType
  dateFrom: string
  dateTo: string
}

export const defaultFilters: Filters = {
  status: "all",
  type: "all",
  dateFrom: "",
  dateTo: "",
}

export interface OrderItem {
  id: string
  type: string
  status: string
  amount: number
  currency: string
  createdAt: Date | string
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  product: {
    id: string
    name: string
    type: string
  }
  payments: PaymentItem[]
}

export interface PaymentItem {
  id: string
  status: string
  amount: number
  paymentGateway: string
  gatewayTransactionId: string | null
  isSubscription: boolean
  createdAt: Date | string
}

