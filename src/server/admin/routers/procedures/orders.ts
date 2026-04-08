import { z } from "zod";
import { adminProcedure } from "@/server/api/trpc";
import type { Prisma } from "@prisma/client";

export const listOrders = adminProcedure
  .input(
    z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      search: z.string().optional(),
      userId: z.string().optional(),
      status: z.enum(["all", "PENDING", "COMPLETED", "CANCELLED", "EXPIRED"]).default("all"),
      type: z.enum(["all", "NEW_PURCHASE", "RENEWAL", "UPGRADE"]).default("all"),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { page, pageSize, search, userId, status, type, dateFrom, dateTo } = input;

    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
    };

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { userId: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status !== "all") {
      where.status = status;
    }

    if (type !== "all") {
      where.type = type;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const total = await ctx.db.order.count({ where });

    const items = await ctx.db.order.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        payments: {
          select: {
            id: true,
            status: true,
            amount: true,
            paymentGateway: true,
            gatewayTransactionId: true,
            isSubscription: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });

export const getOrder = adminProcedure
  .input(z.object({ orderId: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.db.order.findUnique({
      where: { id: input.orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        product: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
  });

export const getOrderStats = adminProcedure.query(async ({ ctx }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalOrders, pendingOrders, completedToday, totalRevenue] = await Promise.all([
    ctx.db.order.count({ where: { deletedAt: null } }),
    ctx.db.order.count({ where: { status: "PENDING", deletedAt: null } }),
    ctx.db.order.count({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: today },
        deletedAt: null,
      },
    }),
    ctx.db.payment.aggregate({
      where: { status: "SUCCESS", deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalOrders,
    pendingOrders,
    completedToday,
    totalRevenue: totalRevenue._sum.amount ?? 0,
  };
});

