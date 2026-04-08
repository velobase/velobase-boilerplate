import { db } from "@/server/db";

export async function checkExistingOrder(
  userId: string,
  productId: string,
  amount?: number,
  quantity?: number,
  currency?: string
) {
  const now = new Date();
  
  const existingOrder = await db.order.findFirst({
    where: {
      userId,
      productId,
      status: "PENDING",
      ...(typeof amount === "number" ? { amount } : {}),
      ...(typeof quantity === "number" ? { quantity } : {}),
      ...(typeof currency === "string" && currency.length > 0 ? { currency } : {}),
      expiresAt: { gt: now },
      deletedAt: null,
    },
    include: {
      product: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  return existingOrder;
}

