
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Wallet, Zap } from 'lucide-react';
import type { Product } from './pricing-desktop';
import { SALES_PAUSED } from '@/config/decommission';

interface CreditPacksSectionProps {
  creditsPackages: Product[];
  loadingId: string | null;
  onPurchase: (productId: string) => void;
  onCryptoPurchase?: (productId: string) => void;
}

export function CreditPacksSection({ creditsPackages, loadingId, onPurchase, onCryptoPurchase }: CreditPacksSectionProps) {
  const salesPaused = SALES_PAUSED;
  return (
    <div className="relative py-12 border-t border-border">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold text-foreground mb-2">Not ready to subscribe?</h2>
        <p className="text-muted-foreground">Top up with credit packs. Pay once, keep forever.</p>
      </div>

      <div data-section="credits" className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto scroll-mt-8">
        {creditsPackages.map((pack) => {
          const isPopular = pack.name.toLowerCase().includes('creator'); 
          return (
            <div 
              key={pack.id}
              className={cn(
                "relative p-6 rounded-2xl border bg-card backdrop-blur-sm transition-all hover:bg-accent/50",
                isPopular ? "border-orange-500/30 ring-1 ring-orange-500/20" : "border-border"
              )}
            >
               {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30 text-[10px] uppercase tracking-wider font-bold px-3 py-0.5 rounded-full">
                  Best Value
                </div>
              )}

              <div className="text-center mb-6 pt-2">
                <h3 className="font-semibold text-foreground mb-1">{pack.name}</h3>
                <div className="flex items-center justify-center gap-2">
                  <div className="text-2xl font-bold text-foreground">{pack.displayPrice}</div>
                  {pack.originalPrice > pack.price && (
                    <div className="text-sm text-muted-foreground line-through">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: (pack.currency || 'USD').toUpperCase(),
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(pack.originalPrice / 100)}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-6 px-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Credits</span>
                    <span className="font-bold text-foreground">{pack.creditsAmount?.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Cost / 1k credits</span>
                    <span className="text-muted-foreground">
                      {pack.unitPrice ?? 'N/A'}
                    </span>
                 </div>
              </div>

              <Button 
                variant={isPopular ? "default" : "secondary"}
                className={cn(
                  "w-full rounded-xl", 
                  isPopular && "bg-orange-600 hover:bg-orange-500 text-white"
                )}
                onClick={() => onPurchase(pack.id)}
                disabled={salesPaused || loadingId !== null}
              >
                 {loadingId === pack.id ? <Sparkles className="w-4 h-4 animate-spin" /> : salesPaused ? 'Paused' : 'Buy Pack'}
              </Button>

              {onCryptoPurchase && (
                <button
                  onClick={() => onCryptoPurchase(pack.id)}
                  disabled={salesPaused || loadingId !== null}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors disabled:pointer-events-none"
                >
                  <Wallet className="w-3 h-3" />
                  <span>or pay with crypto</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
      
      <div className="mt-8 text-center">
         <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-orange-600 dark:text-orange-300 font-medium">
              Pro Tip: Subscriptions are ~50% cheaper per credit than packs!
            </span>
         </div>
      </div>
    </div>
  );
}
