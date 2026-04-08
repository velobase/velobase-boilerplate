import type { PaymentProvider } from "./types";

const providers = new Map<string, PaymentProvider>();

export function registerProvider(name: string, provider: PaymentProvider) {
  providers.set(name.toUpperCase(), provider);
}

export function hasProvider(name: string): boolean {
  return providers.has(name.toUpperCase());
}

export function getProvider(name: string): PaymentProvider {
  const p = providers.get(name.toUpperCase());
  if (!p) throw new Error(`Payment provider not found: ${name}`);
  return p;
}


