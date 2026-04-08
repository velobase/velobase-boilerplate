import { db } from "@/server/db";
import type { PaymentStatus } from "../types";

interface ListPaymentsParams {
  userId: string;
  orderId?: string;
  status?: PaymentStatus;
  limit?: number;
  offset?: number;
}

export async function listPayments({
  userId,
  orderId,
  status,
  limit = 10,
  offset = 0,
}: ListPaymentsParams) {
  const where = {
    userId,
    ...(orderId && { orderId }),
    ...(status && { status }),
    deletedAt: null,
  };

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        order: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc" as const,
      },
      take: limit,
      skip: offset,
    }),
    db.payment.count({ where }),
  ]);

  return {
    payments,
    total,
    limit,
    offset,
  };
}

