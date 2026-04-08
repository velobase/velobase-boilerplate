'use client';

import { PricingDesktop } from '@/components/pricing/desktop/pricing-desktop';
import { PricingMobile } from '@/components/pricing/mobile/pricing-mobile';
import type { Product } from '@/components/pricing/desktop/pricing-desktop';

export type { Product, ProductFeatures } from '@/components/pricing/desktop/pricing-desktop';

interface PricingPageContentProps {
  subscriptionProducts: Product[];
  creditsPackages: Product[];
  userTier: 'FREE' | 'STARTER' | 'PLUS' | 'PREMIUM';
  isLoggedIn: boolean;
  newUserOffer?: {
    state: 'ACTIVE' | 'EXPIRED' | 'CONSUMED' | 'INELIGIBLE';
    endsAt: Date | string | null;
    startedAt: Date | string | null;
  };
}

export function PricingPageContent(props: PricingPageContentProps) {
  return (
    <div className="container mx-auto px-4">
      <div className="hidden md:block">
        <PricingDesktop {...props} />
      </div>
      <div className="block md:hidden">
        <PricingMobile {...props} />
      </div>
    </div>
  );
}
