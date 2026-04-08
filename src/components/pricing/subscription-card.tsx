'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { track } from '@/analytics';
import { BILLING_EVENTS } from '@/analytics/events/billing';
import { useSmartCheckout } from '@/hooks/use-smart-checkout';

interface ProductItem {
  id: string;
  name: string;
  description?: unknown;
  displayPrice: string;
  price: number;
  originalPrice: number;
  discount?: number;
  creditsPerMonth?: number;
  isPurchasable?: boolean;
  userStatus?: {
    hasActiveSubscription: boolean;
    currentBalance: number;
  };
  metadata?: unknown;
}

type BillingInterval = 'MONTH' | 'YEAR';

type PricingTier = 'FREE' | 'STARTER' | 'PLUS' | 'PREMIUM';

const TIER_RANK: Record<PricingTier, number> = {
  FREE: 0,
  STARTER: 1,
  PLUS: 2,
  PREMIUM: 3,
};

function getProductTier(product: ProductItem): PricingTier {
  if (product.price === 0) return 'FREE';
  const name = product.name.toUpperCase();
  if (name.includes('STARTER') || name.includes('WEEKLY')) return 'STARTER';
  if (name.includes('PLUS')) return 'PLUS';
  if (name.includes('PREMIUM')) return 'PREMIUM';
  return 'PLUS'; // Fallback
}

interface SubscriptionCardProps {
  product: ProductItem;
  billingInterval: BillingInterval;
  onRequireLogin?: () => void;
  userTier?: PricingTier;
}

export function SubscriptionCard({ product, billingInterval, onRequireLogin, userTier = 'FREE' }: SubscriptionCardProps) {
  const { data: session } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const subscriptionsDisabled = true;

  const { startCheckout } = useSmartCheckout();

  const productTier = getProductTier(product);
  const currentRank = TIER_RANK[userTier];
  const productRank = TIER_RANK[productTier];

  const isUpgrade = productRank > currentRank;
  const isDowngrade = productRank < currentRank;
  
  // Is this the user's current exact plan tier?
  // Note: userTier is just the tier name. We might want finer grain check if user has active sub.
  // But for pricing card display, matching tier is usually enough to say "Current Plan".
  const isCurrentPlan = userTier === productTier;

  const isPopular = product.name.toLowerCase().includes('plus');

  const handlePurchase = async () => {
    if (subscriptionsDisabled) {
      toast.error('Subscriptions are temporarily unavailable. Please buy credits instead.');
      return;
    }
    // Open login modal if not logged in
    if (!session) {
      onRequireLogin?.();
      return;
    }

    // 埋点：订阅入口点击（区分 FREE/PLUS）
    track(BILLING_EVENTS.SUBSCRIPTION_UPGRADE_CLICK, {
      product_id: product.id,
      source: 'subscription_card',
      user_tier: userTier,
    });

    // 埋点：开始结账（订阅）
    track(BILLING_EVENTS.CREDITS_CHECKOUT_START, {
      package_id: product.id,
      credits: product.creditsPerMonth ?? 0,
      price: product.originalPrice / 100,
      source: 'subscription_card',
      type: 'subscription',
      product_type: 'subscription',
    });

    setIsProcessing(true);

    try {
      const result = await startCheckout({
        productId: product.id,
        isSubscription: true,
        successUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/failed?reason=canceled`,
      });

      if (result.status === 'ERROR') {
        toast.error(result.message || 'Failed to process purchase. Please try again.');
        setIsProcessing(false);
        return;
      }

      // For subscription flow, startCheckout should redirect/succeed.
      // Still reset local UI state to avoid "stuck processing" if navigation is delayed/blocked.
      setIsProcessing(false);
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to process purchase. Please try again.');
      setIsProcessing(false);
    }
  };

  const [priceValue] = (product.displayPrice ?? '').split('/');

  // Extract description from JSON
  const description = product.description && 
    typeof product.description === 'object' && 
    'en' in product.description &&
    typeof (product.description as {en?: unknown}).en === 'string'
      ? (product.description as {en: string}).en
      : '';

  // Extract features from description.features
  const features = product.description && 
    typeof product.description === 'object' && 
    'features' in product.description &&
    Array.isArray((product.description as {features?: unknown}).features)
      ? (product.description as {features: string[]}).features
      : [];

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-7 transition-all duration-200 h-[540px] flex flex-col',
        isPopular && 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 shadow-md',
        !isPopular && 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:shadow-sm'
      )}
    >
      {/* Header: Title + Badge (priority: Current plan > Popular) */}
      <div className="flex items-start justify-between gap-3 mb-5 min-h-[28px]">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white line-clamp-2 break-words flex-1">
          {product.name}
        </h3>
        {isCurrentPlan ? (
          <Badge variant="secondary" className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0 rounded-lg flex-shrink-0">
            Current plan
          </Badge>
        ) : isPopular ? (
          <Badge variant="secondary" className="text-[11px] px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-0 rounded-lg flex-shrink-0">
            POPULAR
          </Badge>
        ) : null}
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[40px] font-semibold text-slate-900 dark:text-white leading-none tracking-tight break-all">
            {priceValue}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
            USD / month
          </span>
        </div>
        
        {/* Fixed height row to prevent layout shift */}
        <div className="mt-2.5 flex items-center gap-2 h-[24px]">
          {billingInterval === 'YEAR' && product.discount && product.discount > 0 ? (
            <>
              <span className="text-sm text-slate-600 dark:text-slate-400 truncate">
                Billed yearly
              </span>
              <Badge className="text-[11px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0 rounded-md flex-shrink-0">
                Save {product.discount}%
              </Badge>
            </>
          ) : null}
        </div>
      </div>

      {/* Description - Fixed 2 lines with ellipsis */}
      <div className="mb-6 h-[44px]">
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 break-words">
            {description}
          </p>
        )}
      </div>

      {/* Features from description.features - Max 5 items, scrollable if more */}
      {features.length > 0 && (
        <div className="flex-1 overflow-hidden min-h-0">
          <ul className="space-y-3 h-full overflow-y-auto pr-1">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <Check className="h-[18px] w-[18px] text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
                <span className="text-[14px] text-slate-600 dark:text-slate-300 break-words">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Spacer to push button to bottom with margin */}
      <div className="mt-6" />

      {/* CTA Button - Fixed at bottom */}
      {isCurrentPlan ? (
        <Button
          onClick={handlePurchase}
          disabled
          className={cn(
            'w-full h-11 text-[15px] font-medium rounded-lg transition-all duration-200',
            'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed'
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Current plan'
          )}
        </Button>
      ) : isDowngrade ? (
        <Button
          disabled
          className={cn(
            'w-full h-11 text-[15px] font-medium rounded-lg transition-all duration-200',
            'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
          )}
        >
          Included in current plan
        </Button>
      ) : (
        <Button
          onClick={handlePurchase}
          disabled={subscriptionsDisabled || isProcessing}
          className={cn(
            'w-full h-11 text-[15px] font-medium rounded-lg transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900',
            'focus-visible:ring-slate-400'
          )}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : subscriptionsDisabled ? (
            'Temporarily unavailable'
          ) : session ? (
            isUpgrade ? `Upgrade to ${product.name}` : `Get ${product.name}`
          ) : (
            'Sign in to Subscribe'
          )}
        </Button>
      )}

    </div>
  );
}
