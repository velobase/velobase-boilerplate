"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, type ReactNode } from "react";
import { useSession } from "next-auth/react";

let didInit = false;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`).exec(document.cookie);
  return m ? decodeURIComponent(m[1] ?? "") : null;
}

/**
 * PostHog 初始化已在 instrumentation-client.ts 完成
 * 此 Provider 负责：
 * 1. 提供 PostHog context 和 hooks
 * 2. 用户登录后自动 identify
 *
 * 注意：LOGIN_SUCCESS 埋点在服务端 auth config 中发送，
 * 因为服务端能准确获取登录方式和 isNewUser
 */
export function PostHogProvider({
  children,
  analyticsEnabled,
}: {
  children: ReactNode;
  analyticsEnabled: boolean;
}) {
  const { data: session } = useSession();

  // Initialize PostHog only when analytics is allowed (EU consent gating).
  useEffect(() => {
    if (!analyticsEnabled) return;
    if (didInit) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    // Extra safety: in EEA, require explicit consent cookie even if caller passes true by mistake.
    const isEea = document.documentElement.dataset.eea === "1";
    const consent = getCookie("app_cookie_consent");
    if (isEea && consent !== "all") return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      defaults: "2025-11-30",
      person_profiles: "identified_only",
      capture_performance: {
        web_vitals: true,
        network_timing: true,
      },
    });
    didInit = true;
  }, [analyticsEnabled]);

  // 用户登录后自动 identify
  useEffect(() => {
    if (session?.user?.id) {
      posthog.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      });
    }
  }, [session?.user]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

