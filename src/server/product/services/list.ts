import { db } from "@/server/db"
import type { Product } from '@prisma/client'

export interface ListProductsParams {
  type?: Product['type']
  status?: Product['status']
  limit?: number
  offset?: number
}

export async function listProducts({ type, status = 'ACTIVE', limit = 10, offset = 0 }: ListProductsParams) {
  const where = {
    ...(type && { type }),
    status,
    deletedAt: null,
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
      include: {
        _count: { select: { orders: true } },
        productSubscription: { include: { plan: { include: { planEntitlements: true } } } },
        creditsPackage: true,
        oneTimeEntitlements: { include: { entitlement: true } },
      },
    }),
    db.product.count({ where }),
  ])

  return { products, total, limit, offset }
}


