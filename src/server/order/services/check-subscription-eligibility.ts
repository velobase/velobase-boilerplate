import { db } from "@/server/db";

export async function checkSubscriptionEligibility(userId: string) {
  // 检查用户是否已有活跃订阅（通过 membership 服务）
  const activeSubscription = await db.userSubscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      deletedAt: null,
    },
    include: {
      cycles: {
        where: {
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
        },
        orderBy: { sequenceNumber: "desc" },
        take: 1,
      },
    },
  });

  // 只有当订阅存在且有未过期的活跃周期时才阻止
  if (activeSubscription && activeSubscription.cycles.length > 0) {
    throw new Error("User already has an active subscription");
  }
}

