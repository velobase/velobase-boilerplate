/**
 * 查询 Credits 余额工具
 */

import { db } from "@/server/db";

export interface CreditsInfo {
  available: number;
  used: number;
  frozen: number;
  total: number;
  accounts: Array<{
    type: string;
    available: number;
    expiresAt?: Date;
  }>;
}

/**
 * 查询用户 credits 余额
 */
export async function queryCredits(userId: string): Promise<CreditsInfo> {
  const accounts = await db.billingAccount.findMany({
    where: {
      userId,
      accountType: "CREDIT",
      status: "ACTIVE",
    },
    orderBy: { expiresAt: "asc" },
  });

  let available = 0;
  let used = 0;
  let frozen = 0;
  let total = 0;

  const accountDetails = accounts.map((a) => {
    const accountAvailable = a.totalAmount - a.usedAmount - a.frozenAmount;
    available += accountAvailable;
    used += a.usedAmount;
    frozen += a.frozenAmount;
    total += a.totalAmount;

    return {
      type: a.subAccountType,
      available: accountAvailable,
      expiresAt: a.expiresAt ?? undefined,
    };
  });

  return {
    available,
    used,
    frozen,
    total,
    accounts: accountDetails,
  };
}

