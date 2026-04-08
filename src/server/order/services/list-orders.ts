import { db } from "@/server/db";
import type { OrderStatus } from "../types";

interface ListOrdersParams {
  userId: string;
  status?: OrderStatus;
  limit?: number;
  offset?: number;
}

export async function listOrders({
  userId,
  status,
  limit = 10,
  offset = 0,
}: ListOrdersParams) {
  const where = {
    userId,
    ...(status && { status }),
    deletedAt: null,
  };

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
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
      orderBy: {
        createdAt: "desc" as const,
      },
      take: limit,
      skip: offset,
    }),
    db.order.count({ where }),
  ]);

  return {
    orders,
    total,
    limit,
    offset,
  };
}

