import { PrismaAdapter } from "@auth/prisma-adapter";
import type { PrismaClient, User } from "@prisma/client";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { normalizeEmail, isGmailAddress } from "./normalize-email";
import { SIGNUP_DISABLED } from "@/config/decommission";

declare module "next-auth/adapters" {
  interface AdapterUser {
    isPrimaryDeviceAccount?: boolean | null;
  }
}

/** Prisma User -> AdapterUser */
function toAdapterUser(user: User): AdapterUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? "",
    emailVerified: user.emailVerified,
    image: user.image,
    isPrimaryDeviceAccount: user.isPrimaryDeviceAccount,
  };
}

/**
 * Custom Prisma adapter
 *
 * - Fix: multi-click magic link causes "No record found for delete" error
 * - Gmail 去重：不同变体 (dots / plus / googlemail.com) 登录同一个账号
 */
export function CustomPrismaAdapter(prisma: PrismaClient): Adapter {
  const baseAdapter = PrismaAdapter(prisma);

  return {
    ...baseAdapter,

    /**
     * 通过邮箱查用户时，对 Gmail 做规范化：
     * - 所有 Gmail 变体通过 canonicalEmail 命中过去
     * - 兼容历史数据（还没写 canonicalEmail 的用户）
     */
    async getUserByEmail(email): Promise<AdapterUser | null> {
      if (!email) return null;

      if (!isGmailAddress(email)) {
        // 非 Gmail，直接走默认逻辑
        return baseAdapter.getUserByEmail?.(email) ?? null;
      }

      const normalized = normalizeEmail(email);

      // 1) 先按 canonicalEmail 精准命中
      let user = await prisma.user.findUnique({
        where: { canonicalEmail: normalized },
      });
      if (user) return toAdapterUser(user);

      // 2) 兼容历史数据：可能只有 email，没有 canonicalEmail
      //    尝试按规范化后的邮箱命中（覆盖之前直接存 normalized 的情况）
      user = await prisma.user.findFirst({
        where: { email: normalized },
      });
      if (user) return toAdapterUser(user);

      // 3) 兜底：精确邮箱匹配，避免行为与原适配器差异过大
      return baseAdapter.getUserByEmail?.(email) ?? null;
    },

    /**
     * 创建用户时，如果是 Gmail，则写入 canonicalEmail
     */
    async createUser(data): Promise<AdapterUser> {
      if (SIGNUP_DISABLED) {
        // Hard block: do not create new users.
        throw new Error("SIGNUP_DISABLED");
      }

      const created = await baseAdapter.createUser!(data);

      if (!created?.id || !created.email || !isGmailAddress(created.email)) {
        return created;
      }

      const normalized = normalizeEmail(created.email);

      try {
        const updated = await prisma.user.update({
          where: { id: created.id },
          data: { canonicalEmail: normalized },
        });
        return toAdapterUser(updated);
      } catch {
        // 可能遇到唯一约束冲突等问题，此时保持原行为即可
        return created;
      }
    },

    /**
     * Fix: multi-click magic link causes "No record found for delete" error
     */
    async useVerificationToken({ identifier, token }) {
      const result = await prisma.verificationToken.findUnique({
        where: { identifier_token: { identifier, token } },
      });
      // deleteMany 不会在没有匹配记录时报错
      await prisma.verificationToken.deleteMany({
        where: { identifier, token },
      });
      return result;
    },
  };
}

