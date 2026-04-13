import { signOut } from "next-auth/react";
import { track, resetUser } from "@/analytics";
import { AUTH_EVENTS } from "@/analytics/events/auth";

type LogoutSource = "header" | "profile" | "sidebar" | "settings" | "other";

export async function logout(options?: { callbackUrl?: string; source?: LogoutSource }) {
  const { callbackUrl, source = "other" } = options ?? {};

  track(AUTH_EVENTS.LOGOUT, { source });
  resetUser();

  await signOut(
    callbackUrl
      ? {
          callbackUrl,
        }
      : undefined,
  );
}


