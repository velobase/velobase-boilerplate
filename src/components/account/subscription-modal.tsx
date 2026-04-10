'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { track } from '@/analytics';
import { BILLING_EVENTS } from '@/analytics/events/billing';
import { useSmartCheckout } from '@/hooks/use-smart-checkout';

interface ProductItem {
  id: string;
  name: string;
  description?: unknown;
  displayPrice: string;           // Localized price with currency symbol
  yearlyDisplayPrice?: string;    // "Billed £276.00 yearly" for yearly products
  price: number; // In cents
  interval?: string | null; // 'month' | 'year' from DB
  metadata?: unknown;
}

interface SubscriptionModalProps {
  products: ProductItem[];
  children?: React.ReactNode;
}

export function SubscriptionModal({ products, children }: SubscriptionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [interval, setInterval] = useState<'month' | 'year'>('year');
  const [isProcessing, setIsProcessing] = useState(false);

  const { startCheckout } = useSmartCheckout();
  const subscriptionsDisabled = false;

  // 筛选付费产品
  const proProducts = useMemo(() => {
    return products.filter(p => p.price > 0);
  }, [products]);
  
  // Find the product matching the selected interval
  const selectedProduct = proProducts.find(p => p.interval?.toLowerCase() === interval) || proProducts[0];

  if (!selectedProduct || proProducts.length === 0) return null;

  const handlePurchase = async () => {
    if (subscriptionsDisabled) {
      toast.error('Subscriptions are temporarily unavailable. Please buy credits instead.');
      return;
    }
    // 埋点：订阅入口点击（Modal）
    track(BILLING_EVENTS.SUBSCRIPTION_UPGRADE_CLICK, {
      product_id: selectedProduct.id,
      source: 'subscription_modal',
    });

    // 埋点：开始结账（订阅，Modal 场景）
    track(BILLING_EVENTS.CREDITS_CHECKOUT_START, {
      package_id: selectedProduct.id,
      credits: 0,
      price: selectedProduct.price / 100,
      source: 'subscription_modal',
      type: 'subscription',
      product_type: 'subscription',
    });

    setIsProcessing(true);
    try {
      const result = await startCheckout({
        productId: selectedProduct.id,
        successUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/failed?reason=canceled`,
      });

      if (result.status === 'ERROR') {
        toast.error(result.message || 'Failed to initiate checkout');
        setIsProcessing(false);
        return;
      }

      // For subscription flow, startCheckout should redirect/succeed.
      // Still reset local UI state to avoid "stuck processing" if navigation is delayed/blocked.
      setIsProcessing(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to initiate checkout');
      setIsProcessing(false);
    }
  };

  // Extract features from description
  const features = selectedProduct.description && 
    typeof selectedProduct.description === 'object' && 
    'features' in selectedProduct.description &&
    Array.isArray((selectedProduct.description as {features?: unknown}).features)
      ? (selectedProduct.description as {features: string[]}).features
      : [];

  // Get prices (convert from cents to dollars)
  const monthlyProduct = proProducts.find(p => p.interval?.toLowerCase() === 'month');
  const yearlyProduct = proProducts.find(p => p.interval?.toLowerCase() === 'year');
  
  const monthlyPrice = monthlyProduct ? monthlyProduct.price / 100 : 29;
  const yearlyPrice = yearlyProduct ? yearlyProduct.price / 100 : 228;
  
  const savings = monthlyPrice > 0 
    ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100) 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden gap-0 border-0 rounded-2xl">
        <div className="bg-slate-900 text-white p-6 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-500/20 to-purple-600/20 z-0" />
           <div className="relative z-10">
             <Badge className="mb-3 bg-orange-500 hover:bg-orange-600 border-0 text-white">PRO PLAN</Badge>
             <DialogTitle className="text-2xl font-bold mb-2">Upgrade to Pro</DialogTitle>
             <p className="text-slate-300 text-sm">Unlock unlimited video creation</p>
           </div>
        </div>

        <div className="p-6 bg-background">
          {/* Interval Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-muted p-1 rounded-lg flex items-center relative">
               <button
                 onClick={() => setInterval('month')}
                 className={cn(
                   "px-4 py-1.5 text-sm font-medium rounded-md transition-all z-10",
                   interval === 'month' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                 )}
               >
                 Monthly
               </button>
               <button
                 onClick={() => setInterval('year')}
                 className={cn(
                   "px-4 py-1.5 text-sm font-medium rounded-md transition-all z-10 flex items-center gap-1.5",
                   interval === 'year' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                 )}
               >
                 Yearly
                 {savings > 0 && (
                   <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">
                     -{savings}%
                   </span>
                 )}
               </button>
            </div>
          </div>

          {/* Price Display */}
          <div className="text-center mb-8">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold tracking-tight">
                {selectedProduct.displayPrice}
              </span>
              <span className="text-muted-foreground">/month</span>
            </div>
            {interval === 'year' && yearlyProduct?.yearlyDisplayPrice && (
              <p className="text-xs text-muted-foreground mt-1">
                {yearlyProduct.yearlyDisplayPrice}
              </p>
            )}
          </div>

          {/* Features List */}
          <div className="space-y-3 mb-8">
            {features.slice(0, 5).map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                </div>
                <span className="text-sm text-foreground/90">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Button 
            className="w-full h-11 text-base font-semibold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-500/20"
            onClick={handlePurchase}
            disabled={isProcessing || subscriptionsDisabled}
          >
            {subscriptionsDisabled ? (
              'Subscriptions temporarily unavailable'
            ) : isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Subscribe ${interval === 'year' ? 'Yearly' : 'Monthly'}`
            )}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground mt-3">
            Secure payment via Telegram. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
