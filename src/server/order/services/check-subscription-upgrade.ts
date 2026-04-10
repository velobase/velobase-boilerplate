import { db } from "@/server/db";
import { getSubscriptionStatus } from "@/server/membership/services/get-subscription-status";
import type { SubscriptionStatusResult } from "@/server/membership/types";

interface ProductWithPlan {
  id: string;
  type: string;
  productSubscription?: {
    plan?: {
      id: string;
      type: string;
    } | null;
  } | null;
}

/**
 * 升级上下文：包含升级所需的元数据
 */
export interface SubscriptionUpgradeContext {
  fromSubscriptionId: string;
  fromGatewaySubId: string;
  fromPlanType: string;
  toPlanType: string;
}

interface CheckSubscriptionUpgradeParams {
  userId: string;
  product: ProductWithPlan;
}

/**
 * 检查当前用户是否可以升级到目标订阅商品。
 *
 * 升级规则：
 * - STARTER -> PLUS / PREMIUM
 * - PLUS -> PREMIUM
 *
 * @returns 升级上下文（如果是升级场景），否则 undefined
 */
export async function checkSubscriptionUpgrade(
  params: CheckSubscriptionUpgradeParams,
): Promise<SubscriptionUpgradeContext | undefined> {
  const { userId, product } = params;

  if (product.type !== "SUBSCRIPTION") return undefined;

  const targetPlanType = product.productSubscription?.plan?.type ?? null;
  if (!targetPlanType) return undefined;

  // 读取当前用户订阅状态（membership 域模型）
  const subStatus: SubscriptionStatusResult = await getSubscriptionStatus({ userId }).catch(
    () => ({ status: "NONE" } as SubscriptionStatusResult),
  );

  if (!subStatus.subscriptionId || !subStatus.currentCycle) return undefined;

  const userSub = await db.userSubscription.findUnique({
    where: { id: subStatus.subscriptionId },
    select: {
      id: true,
      planId: true,
      gateway: true,
      gatewaySubscriptionId: true,
    },
  });

  if (!userSub?.planId || !userSub.gatewaySubscriptionId) return undefined;

  const gateway = userSub.gateway?.toUpperCase();
  if (gateway !== "STRIPE") {
    return undefined;
  }

  const plan = await db.subscriptionPlan.findUnique({
    where: { id: userSub.planId },
    select: { type: true },
  });
  if (!plan) return undefined;

  const fromType = plan.type;

  // 升级规则：
  // - STARTER -> PLUS / PREMIUM
  // - PLUS -> PREMIUM
  const upgradeMap: Record<string, string[]> = {
    STARTER: ["PLUS", "PREMIUM"],
    PLUS: ["PREMIUM"],
  };
  const allowedTargets = upgradeMap[fromType] ?? [];
  const isUpgrade = allowedTargets.includes(targetPlanType);

  if (!isUpgrade) {
    return undefined;
  }

  return {
    fromSubscriptionId: userSub.id,
    fromGatewaySubId: userSub.gatewaySubscriptionId,
    fromPlanType: fromType,
    toPlanType: targetPlanType,
  };
}

