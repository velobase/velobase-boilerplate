
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Coins } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/components/pricing/desktop/pricing-desktop';

interface CreditPacksDrawerProps {
  creditsPackages: Product[];
  onPurchase: (productId: string) => void;
  loadingId: string | null;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
}

export function CreditPacksDrawer({
  creditsPackages,
  onPurchase,
  loadingId,
  trigger,
  title = "Credit Packs",
  description = "One-time payment. Credits never expire."
}: CreditPacksDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl transition-all active:scale-[0.98] group relative overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Top up credits</span>
            </div>
          </Button>
        )}
      </DrawerTrigger>
      
      <DrawerContent className="max-h-[85vh] pb-8 px-0">
        <div className="overflow-y-auto flex-1 px-6 pt-3">
          <DrawerHeader className="mb-6 text-left space-y-1 p-0">
            <DrawerTitle className="text-xl font-bold text-foreground">{title}</DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              {description}
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-1">
              {creditsPackages.map((pack) => {
                const isPopular = pack.name.toLowerCase().includes('creator');
                const estimatedVideos = pack.creditsAmount ? Math.floor(pack.creditsAmount / 250) : 0;

                return (
                  <div 
                    key={pack.id} 
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-colors",
                      isPopular 
                        ? "bg-orange-500/10 border-orange-500/20" 
                        : "bg-transparent border-transparent hover:bg-accent/50"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("font-bold text-lg text-foreground", isPopular && "text-foreground")}>
                          {pack.creditsAmount?.toLocaleString()}
                        </span>
                        {isPopular && (
                          <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 dark:text-orange-300 text-[10px] h-5 px-1.5 border-0 rounded-md">
                            BEST VALUE
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{pack.displayPrice}</span>
                        {pack.originalPrice > pack.price && (
                          <span className="line-through opacity-70">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: (pack.currency || 'USD').toUpperCase(),
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(pack.originalPrice / 100)}
                          </span>
                        )}
                        <span>•</span>
                        <span>~{estimatedVideos} videos</span>
                      </div>
                    </div>

                    <Button 
                      size="sm"
                      className={cn(
                        "h-9 px-5 rounded-lg font-semibold transition-all min-w-[80px]",
                        isPopular 
                          ? "bg-orange-600 text-white hover:bg-orange-500" 
                          : ""
                      )}
                      variant={isPopular ? "default" : "secondary"}
                      onClick={() => onPurchase(pack.id)}
                      disabled={loadingId !== null}
                    >
                      {loadingId === pack.id ? <Sparkles className="w-4 h-4 animate-spin" /> : 'Buy'}
                    </Button>
                  </div>
                )
              })}
          </div>
          
          <div className="mt-6 pt-4 border-t border-border text-center">
             <p className="text-xs text-muted-foreground">
               Want better value? <span className="text-orange-600 dark:text-orange-400">Subscriptions are ~50% cheaper.</span>
             </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
