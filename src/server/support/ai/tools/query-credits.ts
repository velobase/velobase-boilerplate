/**
 * 查询 Credits 余额工具（via Velobase）
 */

import { getVelobase } from "@/server/billing/velobase";
import { VelobaseNotFoundError } from "@velobaseai/billing";

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

export async function queryCredits(userId: string): Promise<CreditsInfo> {
  const vb = getVelobase();

  try {
    const customer = await vb.customers.get(userId);

    return {
      available: customer.balance.available,
      used: customer.balance.used,
      frozen: customer.balance.frozen,
      total: customer.balance.total,
      accounts: customer.accounts.map((a) => ({
        type: a.creditType,
        available: a.available,
        expiresAt: a.expiresAt ? new Date(a.expiresAt) : undefined,
      })),
    };
  } catch (err) {
    if (err instanceof VelobaseNotFoundError) {
      return { available: 0, used: 0, frozen: 0, total: 0, accounts: [] };
    }
    throw err;
  }
}

