import type { Prisma } from "@prisma/client";

type ProductSnapshotInput = {
  id: string;
  name: string;
  description?: unknown;
  price: number;
  originalPrice: number;
  currency: string;
  type: string;
  interval?: string | null;
  status: string;
  metadata?: unknown;
  hasTrial: boolean;
  trialDays?: number | null;
  trialCreditsAmount?: number | null;
};

export function buildProductSnapshot(product: ProductSnapshotInput): Prisma.JsonObject {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? null,
    price: product.price,
    originalPrice: product.originalPrice,
    currency: product.currency,
    type: product.type,
    interval: product.interval ?? null,
    status: product.status,
    metadata: product.metadata ?? null,
    // Trial 配置（用于 Stripe 订阅创建时下发 trial_period_days；即便直扣款不走订阅，也保留以便回溯）
    hasTrial: product.hasTrial,
    trialDays: product.trialDays ?? null,
    trialCreditsAmount: product.trialCreditsAmount ?? null,
  };
}


