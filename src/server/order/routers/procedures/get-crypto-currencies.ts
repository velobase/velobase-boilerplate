import { protectedProcedure } from "@/server/api/trpc";
import { env } from "@/server/shared/env";
import { getNowPaymentsFullCurrencies } from "../../providers/nowpayments";

/**
 * Crypto currency list for UI.
 *
 * Note:
 * - Prefer NowPayments `full-currencies` for completeness (labels, networks, icons).
 * - Still keep a curated order for the top/hot items.
 */
export const getCryptoCurrenciesProcedure = protectedProcedure.query(async () => {
  // Whitelist of currencies we have configured payout wallets for
  // Order matters: low-fee first!
  const ALLOWED_CURRENCIES = new Set([
    "usdtbsc",   // USDT (BSC) - Very low fee
    "ltc",       // Litecoin - Low fee
    "usdcsol",   // USDC (Solana) - Low fee
    "usdtsol",   // USDT (Solana) - Low fee
    "trx",       // TRX (Tron) - Low fee
    "ton",       // TON - Low fee
    "bnbbsc",    // BNB (BSC) - Low fee
    "doge",      // Dogecoin - Very low fee
    "matic",     // Polygon (MATIC) - Very low fee
    "usdtmatic", // USDT (Polygon) - Very low fee
    "usdcmatic", // USDC (Polygon) - Very low fee
    "usdtarb",   // USDT (Arbitrum) - Very low fee
    "usdcarb",   // USDC (Arbitrum) - Very low fee
    "eth",       // Ethereum - High fee
    "usdterc20", // USDT (ERC20) - High fee
    "usdc",      // USDC (ERC20) - High coverage, variable fee
    "usdttrc20", // USDT (TRC20) - High fee (fallback)
    "btc",       // Bitcoin - High fee (legacy)
  ]);

    // Tier 1: Best Experience (Low fee, Fast, Popular)
    // 1. USDT (BSC) - Best overall
    // 2. TRX - Verified good
    // 3. LTC - Classic low fee
    // 4. TON - Telegram popular
    // 5. DOGE - Classic low fee
    // 6. MATIC - Polygon native

    // Tier 2: Good Alternatives (Fast, Low fee)
    // 7. USDT (Polygon)
    // 8. USDC (Polygon)
    // 9. USDT (Solana)
    // 10. USDC (Solana)
    // 11. BNB (BSC)

    // Tier 3: High Coverage / High Fee (Fallback)
    // 12. ETH - Everyone has it, but expensive
    // 13. USDT (ERC20) - Huge volume, expensive
    // 14. USDC (ERC20) - Huge volume, expensive
    // 15. USDT (TRC20) - +$9 fee
    // 16. BTC - Slow, expensive

    const curatedOrder = [
      "usdtbsc", 
      "trx", 
      "ltc", 
      "ton", 
      "doge",
      "matic",
      "usdtmatic",
      "usdcmatic",
      "usdtarb",
      "usdcarb",
      "usdtsol", 
      "usdcsol", 
      "bnbbsc", 
      "eth",
      "usdterc20",
      "usdc",
      "usdttrc20", 
      "btc"
    ] as const;
  const curatedBadges: Record<string, Array<"popular" | "low-fee" | "fast" | "high-fee">> = {
    usdtbsc: ["popular", "low-fee"],
    ltc: ["low-fee", "fast"],
    doge: ["low-fee", "fast"],
    matic: ["low-fee", "fast"],
    usdtmatic: ["low-fee", "fast"],
    usdcmatic: ["low-fee", "fast"],
    usdtarb: ["low-fee", "fast"],
    usdcarb: ["low-fee", "fast"],
    usdcsol: ["low-fee", "fast"],
    usdtsol: ["low-fee", "fast"],
    trx: ["popular", "low-fee", "fast"],
    ton: ["popular", "low-fee", "fast"],
    bnbbsc: ["low-fee"],
    
    eth: ["popular", "high-fee"],
    usdterc20: ["popular", "high-fee"],
    usdc: ["popular", "high-fee"], // Added high-fee warning for consistency
    usdttrc20: ["popular", "high-fee"],
    btc: ["popular", "high-fee"],
  };

  const toSymbol = (codeLower: string) => {
    const up = codeLower.toUpperCase();
    if (up.startsWith("USDT")) return "USDT";
    if (up.startsWith("USDC")) return "USDC";
    if (up.startsWith("DAI")) return "DAI";
    return up;
  };

  const toNetworkLabel = (codeLower: string, networkLower?: string | null) => {
    if (codeLower.includes("trc20")) return "TRC20";
    if (codeLower.includes("erc20")) return "ERC20";
    if (codeLower.includes("bsc")) return "BSC";
    if (codeLower.includes("arb")) return "Arbitrum";
    if (codeLower.includes("sol")) return "Solana";
    if (codeLower.includes("ton")) return "TON";
    if (codeLower.includes("btc")) return "Bitcoin";
    if (codeLower === "eth") return "Ethereum";
    const n = (networkLower ?? "").toLowerCase();
    if (n === "eth") return "Ethereum";
    if (n === "trx") return "Tron";
    if (n === "bsc") return "BSC";
    if (n === "sol") return "Solana";
    if (n === "arb") return "Arbitrum";
    return networkLower ? networkLower.toUpperCase() : "";
  };

  const buildLabel = (id: string, name: string, symbol: string, networkLabel: string) => {
    const isPlain = id === symbol.toLowerCase();
    if (isPlain) return `${name} (${symbol})`;
    return networkLabel ? `${symbol} (${networkLabel})` : `${name} (${symbol})`;
  };

  // If API key is missing, return the curated list only (offline safe).
  if (!env.NOWPAYMENTS_API_KEY) {
    return curatedOrder.map((id) => {
      const symbol = toSymbol(id);
      const network = toNetworkLabel(id, null);
      const name =
        id === "btc"
          ? "Bitcoin"
          : id === "ltc"
            ? "Litecoin"
            : symbol === "USDT"
              ? "Tether USD"
              : symbol === "USDC"
                ? "USD Coin"
                : symbol;
      return {
        id,
        name,
        network,
        symbol,
        label: buildLabel(id, name, symbol, network),
        badges: curatedBadges[id] ?? [],
      };
    });
  }

  const full = await getNowPaymentsFullCurrencies().catch(() => []);

  // normalize + filter by whitelist
  const mapped = full
    .filter((c) => {
      if (!c || c.enable === false) return false;
      const code = c.code?.toLowerCase();
      return code && ALLOWED_CURRENCIES.has(code);
    })
    .map((c) => {
      const id = c.code.toLowerCase();
      const symbol = toSymbol(id);
      const networkLabel = toNetworkLabel(id, c.network);
      const name = c.name || c.code;
      const label = buildLabel(id, name, symbol, networkLabel);
      const badges = curatedBadges[id] ?? [];
      const priority = typeof c.priority === "number" ? c.priority : 0;
      const logoUrl = typeof c.logo_url === "string" && c.logo_url.length > 0
        ? `https://nowpayments.io${c.logo_url}`
        : undefined;
      return { id, name, network: networkLabel || (c.network ?? ""), symbol, label, badges, priority, logoUrl };
    });

  // dedupe by id (keep highest priority)
  const byId = new Map<string, (typeof mapped)[number]>();
  for (const item of mapped) {
    const existing = byId.get(item.id);
    if (!existing || item.priority > existing.priority) byId.set(item.id, item);
  }

  const list = Array.from(byId.values());

  // curated first, then by provider priority (desc)
  const curatedSet = new Set<string>(curatedOrder);
  const curated = curatedOrder
    .map((id) => byId.get(id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const rest = list
    .filter((x) => !curatedSet.has(x.id))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  // keep it reasonable for mobile; still searchable
  const max = 300;
  return [...curated, ...rest].slice(0, max).map(({ priority: _p, ...x }) => x);
});


