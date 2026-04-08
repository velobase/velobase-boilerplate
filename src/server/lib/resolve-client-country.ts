import { getClientCountryFromHeaders } from "./get-client-country";

export type ResolvedCountrySource = "header" | "stored" | "none";

export interface ResolveClientCountryParams {
  headers?: Headers | null;
  storedCountryCode?: string | null;
}

export interface ResolveClientCountryResult {
  /** ISO 3166-1 alpha-2 uppercase (e.g. "GB"), or undefined if unknown */
  countryCode?: string;
  source: ResolvedCountrySource;
  /** Debug-only fields for logging/telemetry */
  headerCountry?: string;
  storedCountry?: string;
}

function normalizeStoredCountryCode(cc?: string | null): string | undefined {
  if (!cc) return undefined;
  const v = cc.trim().toUpperCase();
  if (!v || v === "XX" || v === "UNKNOWN") return undefined;
  if (v.length !== 2) return undefined;
  return v;
}

/**
 * Resolve a best-effort client country code used for pricing and geo routing.
 *
 * Priority:
 * - Stored user.countryCode — authoritative "registration/attribution" country
 * - Request headers (CF/Vercel/proxy) — ONLY a fallback when stored is missing
 *
 * NOTE:
 * - Timezone is intentionally NOT used here. If you need tz fallback, do it separately
 *   and only when countryCode is missing (tz priority must be the lowest).
 */
export function resolveClientCountryCode(params: ResolveClientCountryParams): ResolveClientCountryResult {
  const headerCountry = getClientCountryFromHeaders(params.headers ?? null);
  const storedCountry = normalizeStoredCountryCode(params.storedCountryCode);

  if (storedCountry) {
    return { countryCode: storedCountry, source: "stored", headerCountry, storedCountry };
  }
  if (headerCountry) {
    return { countryCode: headerCountry, source: "header", headerCountry, storedCountry };
  }
  return { countryCode: undefined, source: "none", headerCountry, storedCountry };
}


