'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { track } from '@/analytics';
import { BILLING_EVENTS } from '@/analytics/events/billing';
import { useSmartCheckout } from '@/hooks/use-smart-checkout';
import { useRouter } from 'next/navigation';
import { SALES_PAUSED } from '@/config/decommission';

interface ProductItem {
  id: string;
  name: string;
  description?: unknown;
  displayPrice: string;
  price?: number;
  originalPrice: number;
  currency?: string;
  discount?: number;
  creditsAmount?: number;
  unitPrice?: string;
  isPurchasable?: boolean;
  userStatus?: {
    hasActiveSubscription: boolean;
    currentBalance: number;
  };
}

interface CreditsPackageCardProps {
  product: ProductItem;
  onRequireLogin?: () => void;
}

export function CreditsPackageCard({ product, onRequireLogin }: CreditsPackageCardProps) {
  const { data: session } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const salesPaused = SALES_PAUSED;
  const router = useRouter();

  const { startCheckout } = useSmartCheckout();

  const isBestValue = product.discount && product.discount >= 40;

  const handlePurchase = async () => {
    // Redirect to login if not logged in
    if (!session) {
      onRequireLogin?.();
      return;
    }

    const chargedPriceCents = product.price ?? product.originalPrice;

    // 埋点：选择积分套餐（Pricing 页面）
    track(BILLING_EVENTS.CREDITS_PACKAGE_SELECT, {
      package_id: product.id,
      credits: product.creditsAmount ?? 0,
      price: chargedPriceCents / 100,
      original_price: product.originalPrice / 100,
    });

    // 埋点：开始结账（积分包）
    track(BILLING_EVENTS.CREDITS_CHECKOUT_START, {
      package_id: product.id,
      credits: product.creditsAmount ?? 0,
      price: chargedPriceCents / 100,
      original_price: product.originalPrice / 100,
      source: 'pricing_page',
      product_type: 'credits',
    });

    setIsProcessing(true);

    const result = await startCheckout({
      productId: product.id,
      successUrl: `${window.location.origin}/payment/success`,
      cancelUrl: `${window.location.origin}/payment/failed?reason=canceled`,
    });

    if (result.status === 'ERROR') {
      setIsProcessing(false);
    }
  };

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
        isBestValue && 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 shadow-md',
        !isBestValue && 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 hover:shadow-sm'
      )}
    >
      {/* Header: Title + Badge (priority: Best value > Discount) */}
      <div className="flex items-start justify-between gap-3 mb-5 min-h-[28px]">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white line-clamp-2 break-words flex-1">
          {product.name}
        </h3>
        {salesPaused ? (
          <Badge variant="secondary" className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-0 rounded-lg flex-shrink-0">
            Sales paused
          </Badge>
        ) : isBestValue ? (
          <Badge variant="secondary" className="text-[11px] px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-0 rounded-lg flex-shrink-0">
            BEST VALUE
          </Badge>
        ) : product.discount && product.discount > 0 ? (
          <Badge variant="secondary" className="text-[11px] px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0 rounded-lg flex-shrink-0">
            Save {product.discount}%
          </Badge>
        ) : null}
      </div>

      {/* Credits Amount */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[40px] font-semibold text-slate-900 dark:text-white leading-none tracking-tight break-all">
            {product.creditsAmount?.toLocaleString()}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0">
            credits
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-semibold text-slate-900 dark:text-white">
            {product.displayPrice}
          </div>
          {product.originalPrice > (product.price ?? 0) && (
            <div className="text-sm text-slate-500 line-through">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: (product.currency || 'USD').toUpperCase(),
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }).format(product.originalPrice / 100)}
            </div>
          )}
        </div>
        <div className="mt-1 h-[20px]">
          {product.unitPrice && (
            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
              {product.unitPrice}
            </p>
          )}
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
      <Button
        onClick={handlePurchase}
        disabled={salesPaused || isProcessing}
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
        ) : salesPaused ? (
          'Temporarily unavailable'
        ) : session ? (
          'Buy Credits'
        ) : (
          'Sign in to Buy'
        )}
      </Button>

      {!salesPaused && (
        <button
          onClick={() => {
            if (!session) { onRequireLogin?.(); return; }
            router.push(`/payment/select-crypto?productId=${product.id}`);
          }}
          className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <Wallet className="w-3 h-3" />
          <span>or pay with crypto</span>
        </button>
      )}
    </div>
  );
}
