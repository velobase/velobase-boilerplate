/**
 * 添加用户到 Blur Bypass 白名单
 *
 * 通过设置 UserStats.canBypassBlur = true 来跳过 blur 付费墙
 * 比 PostHog feature flag 更可靠，不依赖外部服务
 */

import { logger } from "@/lib/logger";
import { db } from "@/server/db";

export interface AddBlurBypassResult {
  success: boolean;
  message: string;
  email?: string;
  error?: string;
}

/**
 * 将用户添加到 blur bypass 白名单
 *
 * @param userId - 用户 ID
 * @returns 操作结果
 */
export async function addBlurBypass(userId: string): Promise<AddBlurBypassResult> {
  try {
    // 1. 获取用户信息
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        stats: {
          select: { canBypassBlur: true },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
        error: "USER_NOT_FOUND",
      };
    }

    const userEmail = user.email ?? "unknown";

    // 2. 检查是否已在白名单中
    if (user.stats?.canBypassBlur === true) {
      return {
        success: true,
        message: `User ${userEmail} is already in the blur bypass allowlist`,
        email: userEmail,
      };
    }

    // 3. 更新或创建 UserStats，设置 canBypassBlur = true
    await db.userStats.upsert({
      where: { userId },
      update: { canBypassBlur: true },
      create: {
        userId,
        canBypassBlur: true,
      },
    });

    logger.info({ userId, email: userEmail }, "Added user to blur bypass allowlist");

    return {
      success: true,
      message: `Successfully added ${userEmail} to the blur bypass allowlist. The user will no longer see the blur paywall after refreshing the page.`,
      email: userEmail,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err, userId }, "Failed to add user to blur bypass allowlist");

    return {
      success: false,
      message: "Failed to add user to blur bypass allowlist",
      error: errorMessage,
    };
  }
}
