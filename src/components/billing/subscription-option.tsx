
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Zap, Check, ArrowRight } from 'lucide-react';

interface SubscriptionOptionProps {
  selectedSub: {
    id: string;
    creditsPerMonth?: number;
    price: number;
    name?: string; // Added optional name for button text
    displayPrice?: string;        // Localized price, e.g. "£29.00"
    yearlyDisplayPrice?: string;  // Localized yearly total, e.g. "Billed £276.00 yearly"
  };
  interval: 'month' | 'year';
  setInterval: (val: 'month' | 'year') => void;
  displayPriceString: string;
  yearlyPrice: number;
  yearlySavings: number;
  pricePerCreditRatio: number;
  isProcessing: string | null;
  onPurchase: () => void;
  isMobile: boolean;
  variant?: 'default' | 'concurrency';
  buttonText?: string; // Allow overriding button text
  disabled?: boolean;
  disabledText?: string;
}

export function SubscriptionOption({
  selectedSub,
  interval,
  setInterval,
  displayPriceString,
  yearlyPrice,
  yearlySavings,
  pricePerCreditRatio,
  isProcessing,
  onPurchase,
  isMobile,
  variant = 'default',
  disabled = false,
  disabledText = 'Subscriptions temporarily unavailable',
  ...props // Capture remaining props including buttonText
}: SubscriptionOptionProps) {
  const isConcurrency = variant === 'concurrency';

  return (
    <div className={cn(
      "relative rounded-xl border-2 p-5 flex flex-col overflow-hidden shadow-sm transition-all hover:shadow-md",
      isConcurrency 
        ? "border-orange-500/40 bg-orange-50/30 dark:bg-orange-950/10 ring-2 ring-orange-500/5" 
        : "border-orange-200 dark:border-orange-900/30 bg-orange-50/10 dark:bg-orange-950/5 hover:border-orange-300 dark:hover:border-orange-800"
    )}>
      {/* Best Value Badge */}
      <div className="absolute top-0 right-0 bg-gradient-to-bl from-orange-500 to-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm z-10">
        {isConcurrency ? "RECOMMENDED" : "BEST VALUE"}
      </div>

      {/* Concurrency Highlight Header */}
      {isConcurrency && (
        <div className="mb-4 bg-orange-100 dark:bg-orange-900/40 -mx-5 -mt-5 p-3 px-5 border-b border-orange-200 dark:border-orange-800">
           <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 font-bold text-sm">
              <Zap className="w-4 h-4 fill-orange-500 text-orange-600" />
              Unlock 5x Parallel Generations
           </div>
        </div>
      )}

      {/* Interval Toggle */}
      <div className={cn("flex justify-center mb-4", isMobile && "mb-3")}>
        <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-lg flex items-center relative w-full">
          <button
            onClick={() => setInterval('month')}
            className={cn(
              "flex-1 py-1 text-xs font-semibold rounded-md transition-all z-10",
              interval === 'month' ? "bg-white dark:bg-slate-700 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('year')}
            className={cn(
              "flex-1 py-1 text-xs font-semibold rounded-md transition-all z-10 relative",
              interval === 'year' ? "bg-white dark:bg-slate-700 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Yearly
            {/* Show SAVE tag ALWAYS if savings exist, even if not selected */}
            {yearlySavings > 0 && (
              <span className={cn(
                "absolute -top-2 -right-1 text-[9px] px-1 rounded-full shadow-sm scale-90",
                interval === 'year' 
                  ? "bg-green-500 text-white" 
                  : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border border-green-200 dark:border-green-800"
              )}>
                SAVE {yearlySavings}%
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-current" />
            Pro Subscription
          </span>
        </div>
        
        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-foreground tracking-tight">
              {selectedSub.displayPrice ?? displayPriceString}
            </span>
            <span className="text-muted-foreground font-medium">/mo</span>
          </div>
          {interval === 'year' ? (
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {selectedSub.yearlyDisplayPrice ?? `Billed $${yearlyPrice.toFixed(2)} yearly`} (Save {yearlySavings}%)
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Billed monthly, cancel anytime
            </p>
          )}
        </div>

        {/* Feature List - Simplified on Mobile */}
        {isMobile ? (
          <div className="text-sm text-foreground mb-6 flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-orange-500" />
            <span>{selectedSub.creditsPerMonth?.toLocaleString()} credits / month</span>
          </div>
        ) : (
          <ul className="text-sm space-y-2.5 mb-6">
            <li className="flex items-center gap-2.5 text-foreground font-medium">
              <div className="h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              </div>
              <span>
                {interval === 'year' ? (
                  <>
                    Create ~{Math.floor(((selectedSub.creditsPerMonth ?? 0) * 12) / 300).toLocaleString()} videos / year
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      ({selectedSub.creditsPerMonth ? Math.round(selectedSub.creditsPerMonth / 1000) + 'k' : 0} credits/mo)
                    </span>
                  </>
                ) : (
                  <>
                    Create ~{Math.floor((selectedSub.creditsPerMonth ?? 0) / 300).toLocaleString()} videos / month
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      ({selectedSub.creditsPerMonth ? Math.round(selectedSub.creditsPerMonth / 1000) + 'k' : 0} credits)
                    </span>
                  </>
                )}
              </span>
            </li>
            <li className="flex items-center gap-2.5 text-foreground">
              <div className="h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              </div>
              <span>
                {pricePerCreditRatio > 1 
                  ? <span className="text-orange-600 dark:text-orange-400 font-bold">🔥 {pricePerCreditRatio}x cheaper</span>
                  : "Cheaper"} than one-time pack
              </span>
            </li>
            <li className="flex items-center gap-2.5 text-foreground">
              <div className="h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              </div>
              <span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">⚡️ Skip the queue</span> (Fast Lane)
              </span>
            </li>
            <li className="flex items-center gap-2.5 text-foreground">
              <div className="h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-orange-600 dark:text-orange-400" />
              </div>
              <span>Run simultaneous generations</span>
            </li>
          </ul>
        )}
      </div>

      <Button
        className="w-full mt-auto h-10 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-md shadow-orange-500/20"
        onClick={disabled ? undefined : onPurchase}
        disabled={disabled || !!isProcessing}
      >
        {isProcessing === selectedSub.id && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {/* Dynamic button text with fallback */}
        {disabled ? disabledText : (props.buttonText || `Upgrade to ${selectedSub.name || 'Pro'} Plan`)}
        <ArrowRight className="ml-2 w-4 h-4 opacity-80" />
      </Button>
      <p className="text-[10px] text-center text-muted-foreground mt-2 opacity-80">
        Secure payment via Telegram
      </p>
    </div>
  );
}

