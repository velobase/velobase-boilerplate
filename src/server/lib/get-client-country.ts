/**
 * Extract client country code from request headers.
 *
 * Priority:
 * - Cloudflare: cf-ipcountry
 * - Vercel: x-vercel-ip-country
 * - Generic proxies: x-country-code / x-country
 *
 * Returns ISO 3166-1 alpha-2 uppercase country code (e.g. "FR"), or undefined when unknown.
 */
export function getClientCountryFromHeaders(headers?: Headers | null): string | undefined {
  if (!headers) return undefined;

  const raw =
    headers.get("cf-ipcountry") ??
    headers.get("x-vercel-ip-country") ??
    headers.get("x-country-code") ??
    headers.get("x-country") ??
    undefined;

  if (!raw) return undefined;
  const cc = raw.trim().toUpperCase();
  if (!cc || cc === "XX" || cc === "UNKNOWN") return undefined;
  // Basic sanity: ISO alpha-2
  if (cc.length !== 2) return undefined;
  return cc;
}


