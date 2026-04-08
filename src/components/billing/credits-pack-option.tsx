
'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Coins, Check, Zap } from 'lucide-react';
import { track } from '@/analytics';
import { BILLING_EVENTS } from '@/analytics/events/billing';

interface CreditsPackOptionProps {
  recommendedCredits: {
    id: string;
    creditsAmount?: number;
    price: number;
    name?: string;
    displayPrice?: string;  // Localized price with currency symbol, e.g. "£3.99"
  };
  isProcessing: string | null;
  onPurchase: () => void;
  isMobile: boolean;
  variant?: 'default' | 'concurrency';
  buttonText?: string;
  disabled?: boolean;
  disabledText?: string;
}

export function CreditsPackOption({
  recommendedCredits,
  isProcessing,
  onPurchase,
  isMobile,
  variant = 'default',
  buttonText,
  disabled = false,
  disabledText,
}: CreditsPackOptionProps) {
  const isConcurrency = variant === 'concurrency';

  if (isMobile) {
    return (
      <div className="relative rounded-xl border border-border bg-card/50 p-4 flex flex-col gap-3 active:bg-card transition-colors">
        {isConcurrency && (
           <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
              <Zap className="w-3.5 h-3.5 fill-current" />
              Unlock 2x Parallel Generations
           </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-bold text-foreground text-sm">
                Top up {recommendedCredits.creditsAmount?.toLocaleString()} credits
              </div>
              <div className="text-xs text-muted-foreground">
                One-time payment
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              track(BILLING_EVENTS.CREDITS_PACKAGE_SELECT, {
                package_id: recommendedCredits.id,
                credits: recommendedCredits.creditsAmount ?? 0,
                // price stored in cents
                price: recommendedCredits.price / 100,
              });
              onPurchase();
            }}
            disabled={disabled || !!isProcessing}
            className="h-9 border-border bg-background"
          >
            {isProcessing === recommendedCredits.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : disabled ? (
              disabledText ?? "暂停"
            ) : (
              recommendedCredits.displayPrice ?? `$${(recommendedCredits.price / 100).toFixed(2)}`
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Desktop Full Card View
  return (
    <div className="relative rounded-xl border border-border bg-card p-5 flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors group">
      {isConcurrency && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md border border-orange-100 dark:border-orange-800/50">
           <Zap className="w-3 h-3 fill-current" />
           2x Concurrency
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Emergency Pack
          </span>
        </div>
        
        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">
              {recommendedCredits.displayPrice ?? `$${(recommendedCredits.price / 100).toFixed(2)}`}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Good for ~{Math.floor((recommendedCredits.creditsAmount ?? 0) / 300)} videos
          </p>
        </div>

        <ul className="text-sm text-muted-foreground space-y-3 mb-6">
          <li className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-slate-600 dark:text-slate-400" />
            </div>
            <span>{recommendedCredits.creditsAmount?.toLocaleString()} credits</span>
          </li>
          <li className="flex items-center gap-2.5">
            <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-slate-600 dark:text-slate-400" />
            </div>
            <span>No subscription required</span>
          </li>
        </ul>
      </div>

      <Button
        variant="outline"
        className="w-full mt-auto border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
        onClick={() => {
          track(BILLING_EVENTS.CREDITS_PACKAGE_SELECT, {
            package_id: recommendedCredits.id,
            credits: recommendedCredits.creditsAmount ?? 0,
            price: recommendedCredits.price / 100,
          });
          onPurchase();
        }}
        disabled={disabled || !!isProcessing}
      >
        {isProcessing === recommendedCredits.id && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {disabled ? (disabledText ?? "暂时停止售卖") : (buttonText || "Top Up Once")}
      </Button>
    </div>
  );
}

