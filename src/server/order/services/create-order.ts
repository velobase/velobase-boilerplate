import { db } from "@/server/db";
import type { OrderType } from "../types";
import { checkExistingOrder } from "./check-existing-order";
import { checkSubscriptionEligibility } from "./check-subscription-eligibility";
import { logger } from "@/server/shared/telemetry/logger";
import { buildProductSnapshot } from "./product-snapshot";

interface CreateOrderParams {
  userId: string;
  productId: string;
  type?: OrderType;
  amount?: number;
  quantity?: number;
  currency?: string; // Optional: override currency (for multi-currency pricing)
}

export async function createOrder({
  userId,
  productId,
  type = "NEW_PURCHASE",
  amount,
  quantity,
  currency,
}: CreateOrderParams) {
  // 1. 验证商品存在且状态为 ACTIVE
  const product = await db.product.findUnique({
    where: { id: productId, deletedAt: null },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.status !== "ACTIVE") {
    throw new Error("Product is not available");
  }

  // Normalize currency to lower-case for consistent storage (Stripe expects lower-case; Airwallex uppercases on request)
  const effectiveCurrencyRaw = (currency ?? product.currency ?? "usd").toString();
  const effectiveCurrency = effectiveCurrencyRaw.toLowerCase();

  // 2. 幂等性检查：是否已有有效的待支付订单（金额一致才复用）
  const expectedAmount = typeof amount === "number" ? amount : product.price;
  const expectedQuantity =
    typeof quantity === "number" && Number.isFinite(quantity) && quantity >= 1
      ? Math.floor(quantity)
      : 1;
  const existingOrder = await checkExistingOrder(
    userId,
    productId,
    expectedAmount,
    expectedQuantity,
    effectiveCurrency
  );
  if (existingOrder) {
    logger.info({
      userId,
      productId,
      orderId: existingOrder.id,
      action: "create_order_idempotent",
    }, "Returned existing order (idempotency)");
    return existingOrder;
  }

  // 3. 领域规则检查：防止重复订阅
  // - UPGRADE: 允许（升级路径）
  // - DOWNGRADE: 允许（降级/换档路径）
  // - RENEWAL: 允许（手动续费/预付下一期）
  // - NEW_PURCHASE: 禁止重复订阅（若已有未过期的 ACTIVE 周期）
  if (
    product.type === "SUBSCRIPTION" &&
    type !== "UPGRADE" &&
    type !== "DOWNGRADE" &&
    type !== "RENEWAL"
  ) {
    await checkSubscriptionEligibility(userId);
  }

  // 4. 计算订单过期时间
  const orderTimeoutMinutes = 15;
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + orderTimeoutMinutes);

  // 5. 创建商品快照
  const productSnapshot = buildProductSnapshot(product);

  // 6. 事务：创建订单
  const order = await db.order.create({
    data: {
      userId,
      productId,
      type,
      status: "PENDING",
      amount: expectedAmount,
      quantity: expectedQuantity,
      currency: effectiveCurrency,
      productSnapshot,
      expiresAt,
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
    },
  });

  logger.info({
    userId,
    productId,
    orderId: order.id,
    orderType: type,
    amount: expectedAmount,
    currency: effectiveCurrency,
    expiresAt,
    action: "order_created",
  }, "Order created successfully");

  return order;
}

