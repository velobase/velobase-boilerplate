'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Sparkles, Zap, X } from 'lucide-react';
import type { Product } from './pricing-desktop';

interface StarterPlanCardProps {
  product: Product;
  userTier: 'FREE' | 'STARTER' | 'PLUS' | 'PREMIUM';
  isLoading: boolean;
  onPurchase: () => void;
  disabled?: boolean;
}

export function StarterPlanCard({ 
  product,
  userTier, 
  isLoading, 
  onPurchase,
  disabled = false,
}: StarterPlanCardProps) {
  const isCurrentPlan = userTier === 'STARTER';

  const displayPrice = product.displayPrice ?? '';

  const effectiveCredits = product.creditsPerMonth ?? 2300;
  const estimatedVideos = Math.round(effectiveCredits / 250);

  return (
    <div className={cn(
      "relative p-8 rounded-3xl border bg-card backdrop-blur-sm flex flex-col h-full overflow-hidden transition-all",
      "border-blue-500/30 hover:border-blue-500/50"
    )}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/3 blur-[80px] -z-10 bg-blue-500/10" />
      
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
          Weekly Starter
          <Zap className="w-4 h-4 text-blue-400 fill-blue-400/20" />
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-foreground">
            {displayPrice}
          </span>
          <span className="text-muted-foreground">/week</span>
        </div>
        <p className="text-muted-foreground/60 text-xs mt-1">Flexible weekly billing</p>
      </div>

      <ul className="space-y-4 mb-8 flex-1">
        <FeatureItem active={true} highlight highlightClass="text-blue-600 dark:text-blue-200">
          <span className="font-bold text-blue-600 dark:text-blue-200">
            {effectiveCredits.toLocaleString()} credits
          </span>{' '}
          / week
          <span className="block text-xs font-normal text-muted-foreground mt-0.5">
            ~{estimatedVideos} videos
          </span>
        </FeatureItem>
        
        <FeatureItem active={true}>Up to 2 concurrent generations</FeatureItem>
        <FeatureItem active={true}>Priority processing</FeatureItem>
        <FeatureItem active={true}>Commercial License</FeatureItem>
      </ul>

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
          'Get Started'
        )}
      </Button>
      
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
