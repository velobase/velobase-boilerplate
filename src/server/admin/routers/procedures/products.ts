import { z } from "zod";
import { adminProcedure } from "@/server/api/trpc";
import type { Prisma, ProductType, ProductStatus } from "@prisma/client";
import { getAccessToken, resolveAirwallexBaseUrl } from "@/server/order/providers/airwallex";
import { getAirwallexEnv } from "@/server/shared/env";
import { logger } from "@/server/shared/telemetry/logger";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

function toAirwallexAmount(amountCents: number, currency: string): number {
  const c = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(c)) return amountCents;
  return Number((amountCents / 100).toFixed(2));
}

async function airwallexFetchJson<T>(params: {
  token: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}): Promise<T> {
  const baseUrl = resolveAirwallexBaseUrl();
  const url = new URL(`${baseUrl}${params.path}`);
  if (params.query) {
    for (const [k, v] of Object.entries(params.query)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const method = params.method ?? "GET";
  logger.debug({ method, path: params.path }, "Airwallex Billing API request");

  const resp = await fetch(url.toString(), {
    method,
    headers: {
      authorization: `Bearer ${params.token}`,
      "content-type": "application/json",
    },
    body: method === "POST" ? JSON.stringify(params.body ?? {}) : undefined,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    logger.error({ method, path: params.path, status: resp.status, error: text }, "Airwallex Billing API failed");
    throw new Error(`Airwallex API failed ${method} ${params.path} (${resp.status}): ${text}`);
  }
  return (await resp.json()) as T;
}

type AirwallexBillingProduct = {
  id: string;
  name?: string;
  metadata?: Record<string, string>;
};

type AirwallexProductListResponse = {
  items: AirwallexBillingProduct[];
  page_after: string | null;
};

async function findAirwallexBillingProductByMetadata(params: {
  token: string;
  vvProductId: string;
}): Promise<AirwallexBillingProduct | null> {
  // Airwallex Billing Products list doesn't support metadata filtering, so we scan pages (expected small).
  let page: string | undefined = undefined;
  for (let i = 0; i < 20; i++) {
    const resp: AirwallexProductListResponse = await airwallexFetchJson({
      token: params.token,
      path: "/api/v1/products",
      query: { page_size: 100, ...(page ? { page } : {}) },
    });

    const hit = resp.items.find((p) => (p.metadata?.vv_product_id ?? "") === params.vvProductId);
    if (hit) return hit;

    page = resp.page_after ?? undefined;
    if (!page) break;
  }
  return null;
}

type AirwallexPrice = {
  id: string;
  currency?: string;
  unit_amount?: number;
  type?: string;
  recurring?: { period?: number; period_unit?: string } | null;
  product_id?: string;
  metadata?: Record<string, string>;
};

type AirwallexPriceListResponse = {
  items: AirwallexPrice[];
  page_after: string | null;
};

async function findAirwallexRecurringPrice(params: {
  token: string;
  billingProductId: string;
  currency: string;
  periodUnit: "WEEK" | "MONTH" | "YEAR";
  period: number;
  unitAmount: number;
}): Promise<AirwallexPrice | null> {
  let page: string | undefined = undefined;
  for (let i = 0; i < 20; i++) {
    const resp: AirwallexPriceListResponse = await airwallexFetchJson({
      token: params.token,
      path: "/api/v1/prices",
      query: {
        page_size: 100,
        product_id: params.billingProductId,
        currency: params.currency,
        recurring_period_unit: params.periodUnit,
        recurring_period: params.period,
        ...(page ? { page } : {}),
      },
    });

    const hit = resp.items.find((p: AirwallexPrice) => {
      const sameType = (p.type ?? "").toUpperCase() === "RECURRING";
      const sameUnit =
        typeof p.unit_amount === "number" && Math.abs(p.unit_amount - params.unitAmount) < 0.0001;
      const r = p.recurring ?? null;
      const sameRecurring =
        !!r &&
        (r.period_unit ?? "").toUpperCase() === params.periodUnit &&
        (r.period ?? 1) === params.period;
      return sameType && sameUnit && sameRecurring;
    });
    if (hit) return hit;

    page = resp.page_after ?? undefined;
    if (!page) break;
  }
  return null;
}

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

export const syncAirwallexSubscriptionPrices = adminProcedure
  .input(
    z.object({
      productIds: z.array(z.string()).min(1),
      forceCreateNewPrice: z.boolean().optional(),
      // Optional: explicitly choose which currencies to sync. When omitted, we'll sync:
      // - all localized currencies found in ProductPrice (EUR/GBP/CHF) plus
      // - the product's default currency (usually USD)
      currencies: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    logger.info({ productIds: input.productIds }, "Syncing products to Airwallex Billing");
    // Billing API uses org-level token
    const token = await getAccessToken("org");

    const results: Array<{
      productId: string;
      ok: boolean;
      message?: string;
      billingProductId?: string;
      // Backward compatible: a default/fallback price id (usually USD)
      subscriptionPriceId?: string;
      // Multi-currency: price ids keyed by currency (e.g. { EUR: "...", GBP: "..." })
      subscriptionPriceIdByCurrency?: Record<string, string>;
      action?: "reused" | "created";
    }> = [];

    for (const productId of input.productIds) {
      try {
        const product = await ctx.db.product.findUnique({
          where: { id: productId },
          include: {
            productSubscription: { include: { plan: true } },
          },
        });
        if (!product) {
          results.push({ productId, ok: false, message: "Product not found" });
          continue;
        }
        if (product.type !== "SUBSCRIPTION") {
          results.push({ productId, ok: false, message: "Not a subscription product" });
          continue;
        }

        const plan = product.productSubscription?.plan ?? null;
        const interval = (plan?.interval ?? "UNDEFINED").toString().toUpperCase();
        const intervalCount = typeof plan?.intervalCount === "number" && plan.intervalCount > 0 ? plan.intervalCount : 1;

        const periodUnit =
          interval === "MONTH" || interval === "YEAR" || interval === "WEEK" ? interval : null;
        if (!periodUnit) {
          results.push({ productId, ok: false, message: `Unsupported interval: ${interval}` });
          continue;
        }

        const defaultCurrency = (product.currency ?? "usd").toString().toUpperCase();

        const meta = (product.metadata ?? {}) as Record<string, unknown>;
        const existingAw =
          typeof meta.airwallex === "object" && meta.airwallex !== null ? (meta.airwallex as Record<string, unknown>) : {};

        let billingProductId =
          typeof existingAw.billingProductId === "string" && existingAw.billingProductId.length > 0
            ? existingAw.billingProductId
            : "";
        let subscriptionPriceId =
          typeof existingAw.subscriptionPriceId === "string" && existingAw.subscriptionPriceId.length > 0
            ? existingAw.subscriptionPriceId
            : "";
        const existingByCurrency =
          typeof existingAw.subscriptionPriceIdByCurrency === "object" && existingAw.subscriptionPriceIdByCurrency !== null
            ? (existingAw.subscriptionPriceIdByCurrency as Record<string, unknown>)
            : {};

        // 1) Ensure Airwallex Billing Product
        if (!billingProductId) {
          const found = await findAirwallexBillingProductByMetadata({ token, vvProductId: product.id });
          if (found?.id) {
            billingProductId = found.id;
          } else {
            const created = await airwallexFetchJson<AirwallexBillingProduct>({
              token,
              path: "/api/v1/products/create",
              method: "POST",
              body: {
                request_id: `saas_product_${product.id}`,
                name: product.name,
                description: `saas product ${product.id}`,
                unit: "subscription",
                active: true,
                metadata: {
                  vv_product_id: product.id,
                  vv_env: (getAirwallexEnv() ?? "prod").toString(),
                },
              },
            });
            billingProductId = created.id;
          }
        }

        // 2) Ensure recurring Prices (multi-currency)
        // Determine currencies to sync for this product:
        // - if input.currencies specified: use those
        // - else: use currencies present in ProductPrice table + defaultCurrency
        const currenciesToSync = await (async (): Promise<string[]> => {
          if (Array.isArray(input.currencies) && input.currencies.length > 0) {
            return Array.from(new Set(input.currencies.map((c) => c.toUpperCase())));
          }
          const localized = await ctx.db.productPrice.findMany({
            where: { productId: product.id },
            select: { currency: true },
          });
          const set = new Set<string>(localized.map((r) => r.currency.toUpperCase()));
          set.add(defaultCurrency);
          return Array.from(set);
        })();

        // Fetch localized pricing for these currencies in one query
        const localizedPrices = await ctx.db.productPrice.findMany({
          where: { productId: product.id, currency: { in: currenciesToSync } },
          select: { currency: true, amount: true },
        });
        const localizedAmountMap = new Map<string, number>(
          localizedPrices.map((p) => [p.currency.toUpperCase(), p.amount])
        );

        const subscriptionPriceIdByCurrency: Record<string, string> = {};
        let action: "reused" | "created" = "reused";

        for (const currency of currenciesToSync) {
          // Amount in cents/pence: use localized ProductPrice.amount if present; otherwise fallback to product.price (USD).
          const amountCents = localizedAmountMap.get(currency) ?? product.price;
          // Safety: if caller explicitly requests extra currencies but we don't have a localized price for it,
          // do NOT silently reuse USD cents as e.g. GBP pence / EUR cents.
          // Only allow fallback for the product's default currency; otherwise skip this currency.
          if (!localizedAmountMap.has(currency) && currency !== defaultCurrency) {
            logger.warn(
              { productId: product.id, currency, defaultCurrency },
              "Airwallex sync: skipping currency without localized ProductPrice"
            );
            continue;
          }
          const unitAmount = toAirwallexAmount(amountCents, currency);

          // Reuse existing mapping if present (unless forceCreateNewPrice)
          const existingIdRaw = existingByCurrency[currency];
          const existingId =
            typeof existingIdRaw === "string" && existingIdRaw.length > 0 && !input.forceCreateNewPrice
              ? existingIdRaw
              : "";

          let priceId = existingId;
          if (!priceId) {
            const found = input.forceCreateNewPrice
              ? null
              : await findAirwallexRecurringPrice({
                  token,
                  billingProductId,
                  currency,
                  periodUnit,
                  period: intervalCount,
                  unitAmount,
                });
            if (found?.id) {
              priceId = found.id;
            } else {
              const created = await airwallexFetchJson<AirwallexPrice>({
                token,
                path: "/api/v1/prices/create",
                method: "POST",
                body: {
                  request_id: `saas_price_${product.id}_${currency}_${periodUnit}_${intervalCount}_${unitAmount}`,
                  product_id: billingProductId,
                  currency,
                  pricing_model: "PER_UNIT",
                  unit_amount: unitAmount,
                  billing_type: "IN_ADVANCE",
                  active: true,
                  recurring: {
                    period_unit: periodUnit,
                    period: intervalCount,
                  },
                  metadata: {
                    vv_product_id: product.id,
                    vv_env: (getAirwallexEnv() ?? "prod").toString(),
                  },
                },
              });
              priceId = created.id;
              action = "created";
            }
          }

          if (priceId) {
            subscriptionPriceIdByCurrency[currency] = priceId;
          }
        }

        // Keep backward-compatible subscriptionPriceId as default currency price id if available.
        const defaultCurrencyPriceId = subscriptionPriceIdByCurrency[defaultCurrency];
        if (defaultCurrencyPriceId) {
          subscriptionPriceId = defaultCurrencyPriceId;
        }

        // 3) Persist mapping to our Product.metadata
        const nextMetadata: Record<string, unknown> = {
          ...meta,
          airwallex: {
            ...existingAw,
            billingProductId,
            subscriptionPriceId,
            subscriptionPriceIdByCurrency: {
              ...existingByCurrency,
              ...subscriptionPriceIdByCurrency,
            },
            syncedAt: new Date().toISOString(),
          },
        };

        await ctx.db.product.update({
          where: { id: product.id },
          data: {
            metadata: nextMetadata as Prisma.InputJsonValue,
          },
        });

        logger.info(
          { productId, billingProductId, subscriptionPriceId, subscriptionPriceIdByCurrency, action },
          "Product synced to Airwallex Billing"
        );
        results.push({
          productId,
          ok: true,
          billingProductId,
          subscriptionPriceId,
          subscriptionPriceIdByCurrency,
          action,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error({ productId, error: message }, "Failed to sync product to Airwallex Billing");
        results.push({ productId, ok: false, message });
      }
    }

    logger.info({ total: results.length, ok: results.filter((r) => r.ok).length }, "Airwallex sync completed");
    return { results };
  });

