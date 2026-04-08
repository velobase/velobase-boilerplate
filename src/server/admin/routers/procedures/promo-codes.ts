import { z } from "zod";
import { adminProcedure } from "@/server/api/trpc";
import type { Prisma, PromoCodeType, PromoCodeStatus, PromoGrantType } from "@prisma/client";

export const listPromoCodes = adminProcedure
  .input(
    z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      search: z.string().optional(),
      status: z.enum(["all", "ACTIVE", "DISABLED", "EXPIRED"]).default("all"),
      grantType: z.enum(["all", "CREDIT", "PRODUCT"]).default("all"),
    })
  )
  .query(async ({ ctx, input }) => {
    const { page, pageSize, search, status, grantType } = input;

    const where: Prisma.PromoCodeWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status !== "all") {
      where.status = status as PromoCodeStatus;
    }

    if (grantType !== "all") {
      where.grantType = grantType as PromoGrantType;
    }

    const total = await ctx.db.promoCode.count({ where });

    const items = await ctx.db.promoCode.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { redemptions: true } },
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

export const createPromoCode = adminProcedure
  .input(
    z.object({
      code: z.string().min(1).max(50),
      codeType: z.enum(["UNDEFINED", "KOL_INTERNAL", "USER_PROMOTION"]).default("USER_PROMOTION"),
      grantType: z.enum(["CREDIT", "PRODUCT"]),
      creditsAmount: z.number().int().min(0).default(0),
      productId: z.string().optional(),
      usageLimit: z.number().int().min(0).default(0),
      perUserLimit: z.number().int().min(0).default(1),
      startsAt: z.string().optional(),
      expiresAt: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const code = input.code.trim().toUpperCase();

    const existing = await ctx.db.promoCode.findFirst({ where: { code } });
    if (existing) {
      throw new Error("Code already exists");
    }

    return ctx.db.promoCode.create({
      data: {
        code,
        codeType: input.codeType as PromoCodeType,
        grantType: input.grantType as PromoGrantType,
        creditsAmount: input.creditsAmount,
        productId: input.productId || null,
        usageLimit: input.usageLimit,
        perUserLimit: input.perUserLimit,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        notes: input.notes || null,
        status: "ACTIVE",
      },
    });
  });

export const updatePromoCode = adminProcedure
  .input(
    z.object({
      id: z.string(),
      status: z.enum(["ACTIVE", "DISABLED", "EXPIRED"]).optional(),
      creditsAmount: z.number().int().min(0).optional(),
      usageLimit: z.number().int().min(0).optional(),
      perUserLimit: z.number().int().min(0).optional(),
      expiresAt: z.string().nullable().optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id, expiresAt, ...data } = input;
    return ctx.db.promoCode.update({
      where: { id },
      data: {
        ...data,
        status: data.status as PromoCodeStatus | undefined,
        expiresAt: expiresAt === null ? null : expiresAt ? new Date(expiresAt) : undefined,
      },
    });
  });

export const deletePromoCode = adminProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await ctx.db.promoCode.update({
      where: { id: input.id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  });

