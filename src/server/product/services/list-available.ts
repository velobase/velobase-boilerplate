import { db } from "@/server/db"
import type { Product } from '@prisma/client'

export interface ListAvailableParams {
  type?: Product['type']
  limit?: number
  offset?: number
}

export async function listAvailableProducts({ type, limit = 10, offset = 0 }: ListAvailableParams) {
  const where = {
    ...(type && { type }),
    status: 'ACTIVE' as const,
    isAvailable: true,
    deletedAt: null,
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
      include: {
        productSubscription: { include: { plan: true } },
        creditsPackage: true,
        oneTimeEntitlements: { include: { entitlement: true } },
      },
    }),
    db.product.count({ where }),
  ])

  return { products, total, hasMore: offset + products.length < total }
}


