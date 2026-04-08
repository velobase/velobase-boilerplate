import { db } from "@/server/db";

export async function getOrder(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      product: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      payments: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  return order;
}

