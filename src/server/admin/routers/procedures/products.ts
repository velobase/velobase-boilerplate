import { z } from "zod";
import { adminProcedure } from "@/server/api/trpc";
import type { Prisma, ProductType, ProductStatus } from "@prisma/client";

export const listProducts = adminProcedure
  .input(
    z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      search: z.string().optional(),
      type: z.enum(["all", "SUBSCRIPTION", "CREDITS_PACKAGE", "ONE_TIME_ENTITLEMENT"]).default("all"),
      status: z.enum(["all", "ACTIVE", "INACTIVE"]).default("all"),
      isAvailable: z.enum(["all", "yes", "no"]).default("all"),
    })
  )
  .query(async ({ ctx, input }) => {
    const { page, pageSize, search, type, status, isAvailable } = input;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { id: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type !== "all") {
      where.type = type as ProductType;
    }

    if (status !== "all") {
      where.status = status as ProductStatus;
    }

    if (isAvailable === "yes") where.isAvailable = true;
    if (isAvailable === "no") where.isAvailable = false;

    const total = await ctx.db.product.count({ where });

    const items = await ctx.db.product.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        productSubscription: {
          include: { plan: true },
        },
        creditsPackage: true,
        prices: {
          orderBy: { currency: "asc" },
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

export const getProduct = adminProcedure
  .input(z.object({ productId: z.string() }))
  .query(async ({ ctx, input }) => {
    return ctx.db.product.findUnique({
      where: { id: input.productId },
      include: {
        productSubscription: {
          include: { plan: true },
        },
        creditsPackage: true,
        oneTimeEntitlements: {
          include: { entitlement: true },
        },
      },
    });
  });

export const updateProduct = adminProcedure
  .input(
    z.object({
      productId: z.string(),
      name: z.string().optional(),
      price: z.number().int().min(0).optional(),
      originalPrice: z.number().int().min(0).optional(),
      status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      isAvailable: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
      hasTrial: z.boolean().optional(),
      trialDays: z.number().int().min(0).optional(),
      trialCreditsAmount: z.number().int().min(0).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { productId, ...data } = input;
    return ctx.db.product.update({
      where: { id: productId },
      data: {
        ...data,
        status: data.status as ProductStatus,
      },
    });
  });

export const toggleProductAvailability = adminProcedure
  .input(z.object({ productId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const product = await ctx.db.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) throw new Error("Product not found");

    return ctx.db.product.update({
      where: { id: input.productId },
      data: { isAvailable: !product.isAvailable },
    });
  });
