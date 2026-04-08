import { signOut } from "next-auth/react";
import { track } from "@/analytics";
import { AUTH_EVENTS } from "@/analytics/events/auth";

type LogoutSource = "header" | "profile" | "sidebar" | "settings" | "other";

export async function logout(options?: { callbackUrl?: string; source?: LogoutSource }) {
  const { callbackUrl, source = "other" } = options ?? {};

  // Track logout intent (non-blocking)
  track(AUTH_EVENTS.LOGOUT, { source });

  await signOut(
    callbackUrl
      ? {
          callbackUrl,
        }
      : undefined,
  );
}


