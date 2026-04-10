
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Coins, Sparkles, Wallet, Zap } from 'lucide-react';

import { BillingToggle } from './billing-toggle';
import { PaidPlanCard } from '../desktop/pro-plan-card';
import { StarterPlanCard } from '../desktop/starter-plan-card';
import { StickyFooter } from './sticky-footer';
import type { PricingContentProps } from '../desktop/pricing-desktop';
import { useSmartCheckout } from '@/hooks/use-smart-checkout';
import { SALES_PAUSED } from '@/config/decommission';

export function PricingMobile({
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
  const starterPlan = userTier === 'STARTER' 
    ? subscriptionProducts.find(p => p.planType === 'STARTER' || (p.price === 499 && p.interval === 'WEEK')) 
    : undefined;

  // Find most popular for sticky footer (usually Pro)
  // Use server-computed displayPrice with correct currency symbol
  const popularPlan = paidPlans.find(p => p.name.toUpperCase().includes('PRO')) || paidPlans[0];
  const footerDisplayPrice = popularPlan?.displayPrice ?? '';

  // --- Handlers ---
  // For subscriptions: always card checkout (crypto subscriptions not supported)
  const handleSubscriptionPurchase = async (productId: string) => {
    if (!isLoggedIn) {
      router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent('/pricing')}`);
      return;
    }

    setLoadingId(productId);
    const result = await startCheckout({
      productId,
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

  const handleCreditPackPurchase = async (productId: string) => {
    if (!isLoggedIn) {
      router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent('/pricing')}`);
      return;
    }

    setLoadingId(productId);
    const result = await startCheckout({
      productId,
      successUrl: `${window.location.origin}/payment/success?next=${encodeURIComponent('/create')}`,
      cancelUrl: `${window.location.origin}/pricing#credits`,
    });

    if (result.status === 'ERROR') {
      setLoadingId(null);
    }
  };

  const handleCryptoPurchase = (productId: string) => {
    if (!isLoggedIn) {
      router.push(`/api/auth/signin?callbackUrl=${encodeURIComponent('/pricing')}`);
      return;
    }
    router.push(`/payment/select-crypto?productId=${productId}`);
  };

  return (
    <div className="pb-28">
      <BillingToggle interval={interval} onIntervalChange={setInterval} />

      <div className="space-y-6 px-4 mt-6">
        {starterPlan && (
          <StarterPlanCard 
            product={starterPlan}
            userTier={userTier}
            isLoading={loadingId === starterPlan.id}
            disabled={salesPaused}
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
            disabled={salesPaused}
            onPurchase={() => { void handleSubscriptionPurchase(plan.id); }}
            isPopular={plan.name.toUpperCase().includes('PRO') || plan.name.toUpperCase().includes('PLUS')}
          />
        ))}
      </div>

      {/* 积分包：手机端直接罗列展示 */}
      {creditsPackages.length > 0 && (
        <div data-section="credits" className="mt-8 px-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-500" />
              Credit packs
            </h2>
          </div>

          <div className="space-y-3">
            {creditsPackages.map((pack) => {
              const isPopular = pack.name.toLowerCase().includes('creator');
              // Use server-computed displayPrice with correct currency symbol
              const priceLabel = pack.displayPrice ?? '';

              return (
                <div
                  key={pack.id}
                  className={cn(
                    "relative flex items-center justify-between rounded-xl border px-4 py-3 transition-all active:scale-[0.99]",
                    isPopular
                      ? "bg-orange-500/10 border-orange-500/30 shadow-[0_0_15px_-3px_rgba(249,115,22,0.15)]"
                      : "bg-card border-border"
                  )}
                >
                  {isPopular && (
                    <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-600 text-[9px] font-bold text-white uppercase tracking-wider rounded-full flex items-center gap-1 shadow-sm border border-orange-400/50">
                      <Zap className="w-2.5 h-2.5 fill-current" />
                      Best Value
                    </div>
                  )}

                  <div className="flex items-center gap-3.5">
                    <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border shrink-0",
                        isPopular ? "bg-orange-500/20 border-orange-500/30" : "bg-muted border-border"
                    )}>
                        <Coins className={cn("w-5 h-5", isPopular ? "text-orange-400" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        {pack.creditsAmount?.toLocaleString()}
                        <span className="text-muted-foreground text-xs font-normal">credits</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span className={cn("font-medium", isPopular ? "text-orange-600 dark:text-orange-200" : "text-foreground/80")}>
                           {priceLabel}
                        </span>
                        {pack.originalPrice > pack.price && (
                          <span className="text-muted-foreground/50 line-through text-[10px]">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: (pack.currency || 'USD').toUpperCase(),
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(pack.originalPrice / 100)}
                          </span>
                        )}
                      </div>
                    </div>
      </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCryptoPurchase(pack.id)}
                      disabled={salesPaused || loadingId !== null}
                      className="h-8 px-2 flex items-center text-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:pointer-events-none"
                      title="Pay with crypto"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                    </button>
                    <Button
                      size="sm"
                      className={cn(
                        "h-8 px-4 rounded-lg text-xs font-semibold transition-all",
                        isPopular
                          ? "bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-900/20"
                          : "bg-primary hover:bg-primary/90 text-primary-foreground"
                      )}
                      onClick={() => { void handleCreditPackPurchase(pack.id); }}
                      disabled={salesPaused || loadingId !== null}
                    >
                      {loadingId === pack.id ? <Sparkles className="w-3.5 h-3.5 animate-spin" /> : salesPaused ? 'Paused' : 'Buy'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <StickyFooter 
        displayPrice={footerDisplayPrice}
        isLoading={loadingId === popularPlan?.id}
        // 只要不是 FREE，就视为已经有订阅，不再展示「Upgrade」强 CTA
        isCurrentPlan={userTier !== 'FREE'}
        onUpgrade={() => popularPlan && void handleSubscriptionPurchase(popularPlan.id)}
        disabled={salesPaused}
      />
    </div>
  );
}
