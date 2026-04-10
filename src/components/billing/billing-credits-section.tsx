'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Coins, ArrowRight } from 'lucide-react';
import { track } from '@/analytics';
import { BILLING_EVENTS } from '@/analytics/events/billing';
import Link from 'next/link';
import { useSmartCheckout } from '@/hooks/use-smart-checkout';
import { SALES_PAUSED } from '@/config/decommission';

interface StarterPack {
  id: string;
  name: string;
  price: number;
  displayPrice: string;
  creditsAmount?: number;
}

interface BillingCreditsSectionProps {
  starterPack: StarterPack;
}

export function BillingCreditsSection({ starterPack }: BillingCreditsSectionProps) {
  const { data: session } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const { startCheckout } = useSmartCheckout();
  const salesPaused = SALES_PAUSED;

  const handlePurchase = async () => {
    if (!session) return;

    track(BILLING_EVENTS.CREDITS_CHECKOUT_START, {
      package_id: starterPack.id,
      credits: starterPack.creditsAmount ?? 0,
      price: starterPack.price / 100,
      source: 'billing_page',
      product_type: 'credits',
    });

    setIsProcessing(true);

    const result = await startCheckout({
      productId: starterPack.id,
      successUrl: `${window.location.origin}/payment/success`,
      cancelUrl: `${window.location.origin}/payment/failed?reason=canceled`,
    });

    if (result.status === 'ERROR') {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-semibold">Buy Credits</h3>
        <Link 
          href="/pricing" 
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View all options
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      
      <Card className="border-border/40 bg-card/40 backdrop-blur-md overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Pack info */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                <Coins className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <div className="font-semibold text-foreground">
                  {starterPack.creditsAmount?.toLocaleString()} Credits
                </div>
                <div className="text-sm text-muted-foreground">
                  {starterPack.displayPrice} • One-time purchase
                </div>
              </div>
            </div>
            
            {/* Right: Buy button */}
            <Button
              onClick={handlePurchase}
              disabled={salesPaused || isProcessing}
              className="min-w-[100px]"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : salesPaused ? (
                'Temporarily unavailable'
              ) : (
                'Buy Now'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

