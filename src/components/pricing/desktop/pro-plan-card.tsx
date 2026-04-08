'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Sparkles, X, Crown, Diamond } from 'lucide-react';
import type { Product } from './pricing-desktop';

interface PaidPlanCardProps {
  product: Product;
  interval: 'month' | 'year';
  isLoading: boolean;
  userTier: 'FREE' | 'STARTER' | 'PLUS' | 'PREMIUM';
  onPurchase: () => void;
  isPopular?: boolean;
  disabled?: boolean;
}

const TIER_RANK = {
  FREE: 0,
  STARTER: 1,
  PLUS: 2,
  PREMIUM: 3,
};

function getProductTier(product: Product): 'PLUS' | 'PREMIUM' {
  if (product.planType === 'PREMIUM') return 'PREMIUM';
  if (product.planType === 'PLUS') return 'PLUS';
  if (product.name.toUpperCase().includes('PREMIUM')) return 'PREMIUM';
  return 'PLUS';
}

export function PaidPlanCard({ 
  product,
  interval, 
  isLoading, 
  userTier, 
  onPurchase,
  isPopular,
  disabled = false,
}: PaidPlanCardProps) {
  const planTier = getProductTier(product);
  const currentRank = TIER_RANK[userTier];
  const productRank = TIER_RANK[planTier];

  const isCurrentPlan = userTier === planTier;
  const isDowngrade = productRank < currentRank;
  const isIncluded = isDowngrade;

  const isPremium = planTier === 'PREMIUM';
  
  const borderColor = isPremium ? 'border-purple-500/30 hover:border-purple-500/50' : 'border-orange-500/30 hover:border-orange-500/50';
  const glowColor = isPremium ? 'bg-purple-500/10' : 'bg-orange-500/10';
  const badgeGradient = isPremium ? 'from-purple-500 to-indigo-600' : 'from-orange-500 to-red-600';
  const iconColor = isPremium ? 'text-purple-400 fill-purple-400/20' : 'text-orange-400 fill-orange-400/20';
  const highlightTextColor = isPremium ? 'text-purple-600 dark:text-purple-200' : 'text-orange-600 dark:text-orange-200';

  const displayPrice = product.displayPrice ?? '';
  const yearlyDisplayPrice = product.yearlyDisplayPrice;

  const effectiveCredits = product.creditsPerMonth ?? (isPremium ? 100000 : 30000);
  const estimatedVideos = Math.round(effectiveCredits / 250);

  return (
    <div className={cn(
      "relative p-8 rounded-3xl border bg-card backdrop-blur-sm flex flex-col h-full overflow-hidden transition-all",
      borderColor
    )}>
      <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/3 blur-[80px] -z-10", glowColor)} />
      
      {isPopular && (
        <div className="absolute top-0 right-0">
          <div className={cn("text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg", `bg-gradient-to-bl ${badgeGradient}`)}>
            MOST POPULAR
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
          {isPremium ? 'Premium' : 'Professional'} 
          {isPremium ? (
            <Diamond className={cn("w-4 h-4", iconColor)} />
          ) : (
            <Crown className={cn("w-4 h-4", iconColor)} />
          )}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-foreground">
            {displayPrice}
          </span>
          <span className="text-muted-foreground">/month</span>
        </div>
        {interval === 'year' && yearlyDisplayPrice && (
           <p className="text-muted-foreground/60 text-xs mt-1">{yearlyDisplayPrice}</p>
        )}
      </div>

      <ul className="space-y-4 mb-8 flex-1">
        <FeatureItem active={true} highlight highlightClass={highlightTextColor}>
          <span className={cn("font-bold", highlightTextColor)}>
            {effectiveCredits.toLocaleString()} credits
          </span>{' '}
          / month
          <span className="block text-xs font-normal text-muted-foreground mt-0.5">
            ~{estimatedVideos} videos (High Quality)
          </span>
        </FeatureItem>
        
        {isPremium ? (
          <>
            <FeatureItem active={true}>No waiting — top priority processing</FeatureItem>
            <FeatureItem active={true}>Up to 10 concurrent generations</FeatureItem>
            <FeatureItem active={true}>High quality export</FeatureItem>
            <FeatureItem active={true}>Commercial license</FeatureItem>
          </>
        ) : (
          <>
            <FeatureItem active={true}>No waiting — priority processing</FeatureItem>
            <FeatureItem active={true}>Up to 5 concurrent generations</FeatureItem>
            <FeatureItem active={true}>Commercial license</FeatureItem>
          </>
        )}
      </ul>

      {isIncluded ? (
        <Button 
          disabled
          className="w-full bg-muted text-muted-foreground border-0 h-12 rounded-xl font-medium cursor-not-allowed"
        >
          Included in your plan
        </Button>
      ) : (
        <Button 
          className={cn(
            "w-full border-0 h-12 rounded-xl font-semibold transition-all",
            isCurrentPlan
              ? "bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={disabled ? undefined : onPurchase}
          disabled={disabled || isLoading || isCurrentPlan}
        >
           {isLoading ? (
            <Sparkles className="w-4 h-4 animate-spin" />
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : disabled ? (
            'Temporarily unavailable'
          ) : (
            `Upgrade to ${isPremium ? 'Premium' : 'Pro'}`
          )}
        </Button>
      )}
      
       <p className="text-center text-xs text-muted-foreground mt-3">
         Cancel anytime. No questions asked.
       </p>
    </div>
  );
}

function FeatureItem({ children, active, text, highlight, highlightClass }: { children?: React.ReactNode, active: boolean, text?: string, highlight?: boolean, highlightClass?: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className={cn(
        "flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5",
        active ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground/40"
      )}>
        {active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
      <span className={cn(
        "text-sm",
        active ? (highlight ? (highlightClass || "text-foreground") : "text-foreground/80") : "text-muted-foreground/50 line-through"
      )}>
        {text || children}
      </span>
    </li>
  )
}
