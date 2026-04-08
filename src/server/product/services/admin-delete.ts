import { db } from '@/server/db'

export async function adminDeleteProduct(productId: string) {
  // Soft delete: set deletedAt timestamp
  const product = await db.product.update({
    where: { id: productId },
    data: {
      deletedAt: new Date(),
      status: 'INACTIVE',
      isAvailable: false,
    },
  })

  return product
}

