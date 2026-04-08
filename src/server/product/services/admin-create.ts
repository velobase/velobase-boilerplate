import { db } from '@/server/db'
import type { z } from 'zod'
import type { adminCreateProductSchema } from '../schemas/admin'

type CreateProductInput = z.infer<typeof adminCreateProductSchema>

export async function adminCreateProduct(input: CreateProductInput) {
  const { subscription, creditsPackage, ...productData } = input

  // Create product with related entities in a transaction
  const product = await db.$transaction(async (tx) => {
    // Create base product
    const newProduct = await tx.product.create({
      data: {
        name: productData.name,
        description: productData.description ?? undefined,
        price: productData.price,
        originalPrice: productData.originalPrice,
        currency: productData.currency,
        type: productData.type,
        status: productData.status,
        isAvailable: productData.isAvailable,
        sortOrder: productData.sortOrder,
        interval: subscription?.interval ?? null,
      },
    })

    // Create subscription plan and link if SUBSCRIPTION
    if (productData.type === 'SUBSCRIPTION' && subscription) {
      // Create or reuse subscription plan
      const plan = await tx.subscriptionPlan.create({
        data: {
          type: subscription.planType,
          name: `${subscription.planType} ${subscription.interval}`,
          status: 'ACTIVE',
          interval: subscription.interval,
          intervalCount: 1,
          creditsPerPeriod: subscription.creditsPerMonth,
          creditsPerMonth: subscription.creditsPerMonth, // Keep synced for backward compatibility
        },
      })

      // Link product to plan
      await tx.productSubscription.create({
        data: {
          productId: newProduct.id,
          planId: plan.id,
        },
      })
    }

    // Create credits package if CREDITS_PACKAGE
    if (productData.type === 'CREDITS_PACKAGE' && creditsPackage) {
      await tx.productCreditsPackage.create({
        data: {
          productId: newProduct.id,
          creditsAmount: creditsPackage.creditsAmount,
        },
      })
    }

    return newProduct
  })

  return product
}

