/**
 * EEA/UK/CH country matcher used for consent gating.
 *
 * NOTE:
 * - We reuse the same coverage as payment gateway routing (EU + EEA + UK + CH).
 * - Input should be ISO 3166-1 alpha-2 (e.g. "FR"). Returns false when unknown.
 */
const EEA_LIKE_COUNTRY_CODES = new Set([
  // EU
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT",
  "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA (non-EU) + UK + CH
  "IS", "LI", "NO", "GB", "CH",
]);

export function isEeaLikeCountry(countryCode?: string | null): boolean {
  const cc = (countryCode ?? "").trim().toUpperCase();
  if (cc.length !== 2) return false;
  return EEA_LIKE_COUNTRY_CODES.has(cc);
}


