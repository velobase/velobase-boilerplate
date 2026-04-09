import { resendProvider } from "./resend";
import { sendgridProvider } from "./sendgrid";
import type { EmailProvider } from "../types";

const providerRegistry: Record<string, EmailProvider> = {
  resend: resendProvider,
  sendgrid: sendgridProvider,
};

/**
 * Parse EMAIL_PROVIDER env into an ordered provider chain.
 *
 * Supported formats:
 *   "resend"              → [resend]
 *   "sendgrid"            → [sendgrid]
 *   "resend,sendgrid"     → [resend, sendgrid]  (resend first, sendgrid fallback)
 *   "sendgrid,resend"     → [sendgrid, resend]  (sendgrid first, resend fallback)
 *
 * Only providers whose API keys are actually configured will be included.
 */
export function resolveProviderChain(envValue?: string): EmailProvider[] {
  const raw = envValue?.trim();

  if (!raw) {
    return Object.values(providerRegistry).filter((p) => p.isAvailable());
  }

  const names = raw.split(",").map((s) => s.trim().toLowerCase());
  const chain: EmailProvider[] = [];

  for (const name of names) {
    const provider = providerRegistry[name];
    if (!provider) {
      throw new Error(
        `Unknown email provider "${name}". Available: ${Object.keys(providerRegistry).join(", ")}`,
      );
    }
    if (provider.isAvailable()) {
      chain.push(provider);
    }
  }

  return chain;
}

export { resendProvider, sendgridProvider };
