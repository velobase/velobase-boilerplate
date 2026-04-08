"use client";

import { useFeatureFlagVariantKey } from "posthog-js/react";
import { api } from "@/trpc/react";
import type { ProductType } from "@prisma/client";
import type { ProductItem as ServerProductItem } from "@/server/product/services/list-for-pricing";

// 使用服务端定义的产品类型
export type ProductItem = ServerProductItem;

interface UsePricingProductsOptions {
  type: ProductType;
  limit?: number;
  enabled?: boolean;
}

interface UsePricingProductsResult {
  products: ProductItem[];
  isLoading: boolean;
  // priceVariant 已废弃，为了兼容性暂时保留，返回 undefined
  priceVariant?: undefined;
}

/**
 * 统一的定价产品 hook
 * 已移除 AB 测试逻辑，返回所有产品
 */
export function usePricingProducts({
  type,
  limit = 20,
  enabled = true,
}: UsePricingProductsOptions): UsePricingProductsResult {
  const { data, isLoading } = api.product.listForPricing.useQuery(
    { type, limit },
    { enabled }
  );

  const products = data?.products ?? [];

  return {
    products,
    isLoading,
    priceVariant: undefined,
  };
}

/**
 * 获取订阅产品
 */
export function useSubscriptionProducts(options?: { enabled?: boolean }) {
  return usePricingProducts({
    type: "SUBSCRIPTION",
    limit: 20,
    enabled: options?.enabled,
  });
}

/**
 * 获取积分包产品
 */
export function useCreditsPackages(options?: { enabled?: boolean; limit?: number }) {
  return usePricingProducts({
    type: "CREDITS_PACKAGE",
    limit: options?.limit ?? 10,
    enabled: options?.enabled,
  });
}

/**
 * Credits Pack AB Test
 * 
 * Variants:
 * - 'control': 推荐 $4.99 Mini Pack (prod-credits-atomic-001)
 * - 'test': 推荐 $9.99 Starter Pack (prod-credits-starter-001)
 */
export type CreditsPackVariant = "control" | "test";

export function useCreditsPackVariant(): CreditsPackVariant {
  const variant = useFeatureFlagVariantKey("credits-pack-ab-test");
  if (variant === "test") return "test";
  return "control";
}

