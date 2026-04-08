import { db } from "@/server/db";

interface CancelOrderParams {
  orderId: string;
  userId: string;
  reason?: string;
}

export async function cancelOrder({
  orderId,
  userId,
  reason: _reason,
}: CancelOrderParams) {
  const order = await db.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (order.status !== "PENDING") {
    throw new Error("Cannot cancel order with status: " + order.status);
  }

  const updatedOrder = await db.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
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
      payments: true,
    },
  });

  return updatedOrder;
}

