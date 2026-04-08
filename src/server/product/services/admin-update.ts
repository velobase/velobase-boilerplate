import { db } from '@/server/db'
import type { z } from 'zod'
import type { adminUpdateProductSchema } from '../schemas/admin'

type UpdateProductInput = z.infer<typeof adminUpdateProductSchema>

export async function adminUpdateProduct(input: UpdateProductInput) {
  const { productId, creditsPerMonth, creditsAmount, ...updates } = input

  // Update product and related entities in a transaction
  const product = await db.$transaction(async (tx) => {
    // Update base product
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { 
          description: updates.description ? updates.description : undefined 
        }),
        ...(updates.price !== undefined && { price: updates.price }),
        ...(updates.originalPrice !== undefined && { originalPrice: updates.originalPrice }),
        ...(updates.status && { status: updates.status }),
        ...(updates.isAvailable !== undefined && { isAvailable: updates.isAvailable }),
        ...(updates.sortOrder !== undefined && { sortOrder: updates.sortOrder }),
      },
    })

    // Update subscription plan credits if provided
    if (creditsPerMonth !== undefined) {
      const productSub = await tx.productSubscription.findUnique({
        where: { productId },
      })

      if (productSub) {
        await tx.subscriptionPlan.update({
          where: { id: productSub.planId },
          data: { 
            creditsPerPeriod: creditsPerMonth,
            creditsPerMonth, // Keep synced for backward compatibility
          },
        })
      }
    }

    // Update credits package amount if provided
    if (creditsAmount !== undefined) {
      await tx.productCreditsPackage.update({
        where: { productId },
        data: { creditsAmount },
      })
    }

    return updatedProduct
  })

  return product
}

