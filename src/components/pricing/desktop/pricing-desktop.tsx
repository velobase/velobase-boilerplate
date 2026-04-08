
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { BillingToggle } from './billing-toggle';
import { FreePlanCard } from './free-plan-card';
import { PaidPlanCard } from './pro-plan-card';
import { StarterPlanCard } from './starter-plan-card';
import { CreditPacksSection } from './credit-packs-section';
import { useSmartCheckout } from '@/hooks/use-smart-checkout';
import { SALES_PAUSED } from '@/config/decommission';

// Define types based on usage
export interface ProductFeatures {
  features?: string[];
  [key: string]: unknown;
}

export interface Product {
  id: string;
  name: string;
  description: ProductFeatures | null;
  price: number;
  originalPrice: number;
  currency?: string;
  interval?: string | null;
  // From backend: for subscriptions
  creditsPerMonth?: number;
  features?: string[];
  planType?: 'FREE' | 'STARTER' | 'PLUS' | 'PREMIUM';
  // From backend: for credits packages / pricing display
  displayPrice?: string;
  unitPrice?: string;
  creditsAmount?: number;
  metadata?: unknown;
  // Pre-calculated display prices (with correct currency symbol)
  monthlyDisplayPrice?: string;  // e.g. "£16.00" for yearly plans
  yearlyDisplayPrice?: string;   // e.g. "Billed £192.00 yearly"
}

export interface PricingContentProps {
  subscriptionProducts: Product[];
  creditsPackages: Product[];
  // BillingStatus.tier：FREE / STARTER / PLUS / PREMIUM
  userTier: 'FREE' | 'STARTER' | 'PLUS' | 'PREMIUM';
  isLoggedIn: boolean;
  newUserOffer?: {
    state: 'ACTIVE' | 'EXPIRED' | 'CONSUMED' | 'INELIGIBLE';
    endsAt: Date | string | null;
    startedAt: Date | string | null;
  };
}

export function PricingDesktop({
  subscriptionProducts,
  creditsPackages,
  userTier,
  isLoggedIn,
  newUserOffer: _newUserOffer,
}: PricingContentProps) {
  const [interval, setInterval] = useState<'month' | 'year'>('year');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();
  const { startCheckout } = useSmartCheckout();
  const subscriptionsDisabled = true;
  const salesPaused = SALES_PAUSED;

  // --- Data Processing ---
  // Get all paid plans for current interval, sort by price
  // Exclude products with special useCase (video_unlock_drawer, download_paywall, etc.)
  const paidPlans = subscriptionProducts
    .filter(p => {
      if (p.price <= 0) return false;
      if (p.interval !== interval) return false;
      const meta = p.metadata as { useCase?: string } | null;
      if (meta?.useCase) return false; // Exclude special use case products
      return true;
    })
    .sort((a, b) => a.price - b.price);

  // If user is on STARTER plan, find it and show it
  // We look for planType === 'STARTER' (populated by backend) or fallback to ID check
  const starterPlan = userTier === 'STARTER' 
    ? subscriptionProducts.find(p => p.planType === 'STARTER' || (p.price === 499 && p.interval === 'WEEK')) 
    : undefined;

  // --- Handlers ---
  // For subscriptions: always card checkout (crypto subscriptions not supported)
  const handleSubscriptionPurchase = async (productId: string) => {
    if (subscriptionsDisabled) {
      toast.error('Subscriptions are temporarily unavailable. Please buy credits instead.');
      return;
    }
    if (!isLoggedIn) {
      router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent('/pricing')}`);
      return;
    }

    setLoadingId(productId);
    const result = await startCheckout({
      productId,
      isSubscription: true,
      successUrl: `${window.location.origin}/payment/success?next=${encodeURIComponent('/create')}`,
      cancelUrl: `${window.location.origin}/pricing`,
    });

    if (result.status === 'ERROR') {
      toast.error(result.message || 'Failed to start checkout');
      setLoadingId(null);
      return;
    }

    // Reset local loading state even if the page is about to redirect.
    setLoadingId(null);
  };

  // For credit packs: use smart checkout (respects user preference)
  const handleCreditPackPurchase = async (productId: string, price: number) => {
    if (!isLoggedIn) {
      router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent('/pricing')}`);
      return;
    }

    setLoadingId(productId);
    const result = await startCheckout({
      productId,
      amount: price / 100,
      successUrl: `${window.location.origin}/payment/success?next=${encodeURIComponent('/create')}`,
      cancelUrl: `${window.location.origin}/pricing`,
    });

    if (result.status === 'DIALOG_OPENED' || result.status === 'ERROR') {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-16 md:space-y-24">
      
      <div className="space-y-10">
        <BillingToggle 
          interval={interval} 
          onIntervalChange={setInterval} 
        />

        <div className="grid md:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
          {!starterPlan && (
            <FreePlanCard 
              userTier={userTier} 
              isLoggedIn={isLoggedIn} 
            />
          )}
          
          {starterPlan && (
            <StarterPlanCard 
              product={starterPlan}
              userTier={userTier}
              isLoading={loadingId === starterPlan.id}
              disabled={subscriptionsDisabled}
              onPurchase={() => { void handleSubscriptionPurchase(starterPlan.id); }}
            />
          )}
          
          {paidPlans.map(plan => (
            <PaidPlanCard 
              key={plan.id}
              product={plan}
              interval={interval}
              userTier={userTier}
              isLoading={loadingId === plan.id}
              disabled={subscriptionsDisabled || salesPaused}
              onPurchase={() => { void handleSubscriptionPurchase(plan.id); }}
              isPopular={plan.name.toUpperCase().includes('PRO') || plan.name.toUpperCase().includes('PLUS')}
            />
          ))}
        </div>
      </div>

      <CreditPacksSection 
        creditsPackages={creditsPackages}
        loadingId={loadingId}
        onPurchase={(id) => { 
          const pack = creditsPackages.find(p => p.id === id);
          void handleCreditPackPurchase(id, pack?.price ?? 0); 
        }}
      />

    </div>
  );
}
