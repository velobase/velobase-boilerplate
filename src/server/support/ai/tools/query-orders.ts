/**
 * 查询订单工具
 */

import { db } from "@/server/db";

export interface OrderInfo {
  id: string;
  amount: number;
  currency: string;
  status: string;
  productName: string;
  createdAt: Date;
}

export interface OrdersResult {
  orders: OrderInfo[];
  totalCount: number;
  totalPaidCents: number;
}

/**
 * 查询用户最近订单
 */
export async function queryOrders(userId: string, limit = 10): Promise<OrdersResult> {
  const orders = await db.order.findMany({
    where: { userId },
    include: {
      product: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const totalCount = await db.order.count({
    where: { userId },
  });

  const stats = await db.userStats.findUnique({
    where: { userId },
    select: { totalPaidCents: true },
  });

  return {
    orders: orders.map((o) => ({
      id: o.id,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      productName: o.product.name,
      createdAt: o.createdAt,
    })),
    totalCount,
    totalPaidCents: stats?.totalPaidCents ?? 0,
  };
}

