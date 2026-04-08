'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { StandardFlow } from './insufficient-credits/flows/standard-flow';
import { TrialEndedFlow } from './insufficient-credits/flows/trial-ended-flow';
import { IpLimitFlow } from './insufficient-credits/flows/ip-limit-flow';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserTier, PlanType } from './insufficient-credits/hooks/use-upgrade-strategy';

interface Product {
  id: string;
  name: string;
  price: number;
  creditsAmount?: number;
  creditsPerMonth?: number;
  interval?: string | null;
  planType?: PlanType;
}

interface CreditsDialogContentProps {
  isLoading: boolean;
  requiredCredits: number;
  recommendedCredits: {
    id: string;
    creditsAmount?: number;
    price: number;
    name: string;
  } | null;
  selectedSub: {
    id: string;
    creditsPerMonth?: number;
    price: number;
    name: string;
    interval?: string | null;
  } | null;
  interval: 'month' | 'year';
  setInterval: (val: 'month' | 'year') => void;
  handlePurchase: (
    id: string,
    credits: number,
    price: number,
    kind?: 'credits' | 'subscription'
  ) => void | Promise<void>;
  isProcessing: string | null;
  displayPriceString: string;
  yearlyPrice: number;
  yearlySavings: number;
  pricePerCreditRatio: number;
  isMobile: boolean;
  variant?: 'credits' | 'ip-limit';
  limitMessage?: string;
  isTrial?: boolean;
  trialEndsAt?: Date | string | null;
  currentBalance?: number;
  userTier?: UserTier;
  availableSubscriptions?: Product[];
  availableCreditsPacks?: Product[];
}

export function CreditsDialogContent({
  isLoading,
  requiredCredits,
  recommendedCredits,
  selectedSub,
  interval,
  setInterval,
  handlePurchase,
  isProcessing,
  displayPriceString,
  yearlyPrice,
  yearlySavings,
  pricePerCreditRatio,
  isMobile,
  variant = 'credits',
  limitMessage,
  isTrial,
  currentBalance = 0,
  userTier = 'starter',
  availableSubscriptions = [],
  availableCreditsPacks = [],
}: CreditsDialogContentProps) {
  const isIpLimit = variant === 'ip-limit';
  const isTrialUser = !!isTrial;

  // Loading State
  if (isLoading) {
  return (
    <div className={cn("flex flex-col", isMobile ? "pb-8" : "h-full")}>
        <div className={cn("p-6 pb-2", isMobile && "shrink-0")}>
           {/* Skeleton Header */}
           <div className="space-y-3">
             <Skeleton className="h-4 w-32" />
             <Skeleton className="h-12 w-full rounded-lg" />
           </div>
        </div>
        <div className={cn("p-6 pt-2 gap-4", isMobile ? "flex flex-col" : "grid md:grid-cols-2")}>
          <div className="border rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-full mt-4" />
              </div>
          <div className="border rounded-xl p-4 space-y-3">
             <div className="flex justify-between">
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full mt-4" />
      </div>
        </div>
      </div>
    );
  }

  // Scenario 1: IP Limit
  if (isIpLimit) {
    // Use full arrays if available, otherwise fallback to single item
    const subs = availableSubscriptions.length > 0 ? availableSubscriptions : (selectedSub ? [selectedSub] : []);
    const packs = availableCreditsPacks.length > 0 ? availableCreditsPacks : (recommendedCredits ? [recommendedCredits] : []);
    
    return (
            <>
        <IpLimitFlow isMobile={isMobile} limitMessage={limitMessage} />
        {subs.length > 0 && (
           <StandardFlow
             isMobile={isMobile}
             requiredCredits={requiredCredits}
             currentBalance={currentBalance}
             availableSubscriptions={subs}
             availableCreditsPacks={packs}
             userTier="free"
             handlePurchase={handlePurchase}
             isProcessing={isProcessing}
                  interval={interval}
                  setInterval={setInterval}
                  displayPriceString={displayPriceString}
                  yearlyPrice={yearlyPrice}
                  yearlySavings={yearlySavings}
                  pricePerCreditRatio={pricePerCreditRatio}
           />
        )}
      </>
    );
  }

  // Scenario 2: Trial Ended
  if (isTrialUser) {
    return <TrialEndedFlow isMobile={isMobile} handlePurchase={handlePurchase} />;
  }

  // Scenario 3: Standard Insufficient Credits (Strategy Pattern)
  // Use full arrays if available, otherwise fallback to single item
  const subs = availableSubscriptions.length > 0 ? availableSubscriptions : (selectedSub ? [selectedSub] : []);
  const packs = availableCreditsPacks.length > 0 ? availableCreditsPacks : (recommendedCredits ? [recommendedCredits] : []);
  
  return (
    <>
      <StandardFlow
        isMobile={isMobile}
        requiredCredits={requiredCredits}
        currentBalance={currentBalance}
        availableSubscriptions={subs}
        availableCreditsPacks={packs}
        userTier={userTier}
        handlePurchase={handlePurchase}
                  isProcessing={isProcessing}
                  interval={interval}
                  setInterval={setInterval}
                  displayPriceString={displayPriceString}
                  yearlyPrice={yearlyPrice}
                  yearlySavings={yearlySavings}
                  pricePerCreditRatio={pricePerCreditRatio}
      />
      
      {/* Footer Link */}
        <div className="bg-muted/30 p-3 text-center border-t border-border mt-auto">
          <Link
            href="/pricing"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            View all available plans
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
    </>
  );
}
