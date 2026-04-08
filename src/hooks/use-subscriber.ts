"use client";

import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";

export function useIsSubscriber() {
  const { data: session } = useSession();
  const { data: billingStatus, isLoading } = api.account.getBillingStatus.useQuery(undefined, {
    enabled: !!session,
    refetchOnWindowFocus: false,
  });

  // 订阅用户：由后端字段决定（避免前端硬编码 tier 规则）
  const isSubscriber =
    !!billingStatus && billingStatus.tier !== "FREE";

  return {
    isSubscriber,
    isLoading: !!session && isLoading,
    billingStatus,
  };
}


