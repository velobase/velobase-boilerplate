import type { Order, Payment, Product } from '@prisma/client'

export type FulfillmentContext = {
  order: Order
  product: Product
  payment: Payment
}

export interface Fulfiller {
  canHandle(product: Product): boolean
  getName(): string
  fulfill(ctx: FulfillmentContext): Promise<void>
}


