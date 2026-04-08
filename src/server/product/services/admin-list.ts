import { db } from '@/server/db'
import type { z } from 'zod'
import type { adminListProductsSchema } from '../schemas/admin'

type ListProductsInput = z.infer<typeof adminListProductsSchema>

export async function adminListProducts(input: ListProductsInput) {
  const { type, status, limit, offset } = input

  const where = {
    deletedAt: null,
    ...(type && { type }),
    ...(status && { status }),
  }

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        productSubscription: {
          include: {
            plan: true,
          },
        },
        creditsPackage: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    }),
    db.product.count({ where }),
  ])

  // Format products to match ProductItemSchema
  const formattedProducts = products.map((product) => {
    const displayPrice = `$${(product.price / 100).toFixed(2)}`
    const discount = product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      originalPrice: product.originalPrice,
      displayPrice,
      currency: product.currency,
      type: product.type,
      interval: product.interval,
      status: product.status,
      isAvailable: product.isAvailable,
      sortOrder: product.sortOrder,
      discount,
      creditsPerMonth: product.productSubscription?.plan.creditsPerPeriod ?? product.productSubscription?.plan.creditsPerMonth,
      creditsAmount: product.creditsPackage?.creditsAmount,
      productSubscription: product.productSubscription,
      creditsPackage: product.creditsPackage,
    }
  })

  return {
    products: formattedProducts,
    total,
    hasMore: offset + products.length < total,
  }
}

