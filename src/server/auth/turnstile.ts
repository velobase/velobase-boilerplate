import { env } from "@/env";
import { logger } from "@/lib/logger";

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * Verify Cloudflare Turnstile token
 *
 * Docs: https://developers.cloudflare.com/turnstile/reference/verify-siteverify/
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string | null,
): Promise<TurnstileVerifyResponse & { skipped?: boolean }> {
  const secret = env.TURNSTILE_SECRET_KEY;

  // If not configured, skip verification (fail-open) but log once.
  if (!secret) {
    logger.debug("TURNSTILE_SECRET_KEY not configured, skipping Turnstile verification");
    return { success: true, skipped: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secret);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, "Turnstile verification HTTP error");
      return { success: true, skipped: true };
    }

    const data = (await res.json()) as TurnstileVerifyResponse;

    if (!data.success) {
      logger.warn({ data }, "Turnstile verification failed");
    }

    return data;
  } catch (error) {
    logger.error({ error }, "Turnstile verification threw error, skipping");
    // 网络异常时，为避免误伤正常用户，选择跳过验证
    return { success: true, skipped: true, "error-codes": ["network-error"] };
  }
}


