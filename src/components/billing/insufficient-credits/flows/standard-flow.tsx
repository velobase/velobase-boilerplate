import { cn } from '@/lib/utils';
import { MicroHeader } from '../shared/micro-header';
import { SubscriptionOption } from '../../subscription-option';
import { CreditsPackOption } from '../../credits-pack-option';
import { useUpgradeStrategy } from '../hooks/use-upgrade-strategy';
import type { UserTier, PlanType } from '../hooks/use-upgrade-strategy';
import { SALES_PAUSED } from '@/config/decommission';

interface Product {
  id: string;
  name: string;
  price: number;
  creditsAmount?: number;
  creditsPerMonth?: number;
  interval?: string | null;
  planType?: PlanType;
  displayPrice?: string;        // Localized price with currency symbol
  yearlyDisplayPrice?: string;  // Localized yearly total
}

interface StandardFlowProps {
  isMobile: boolean;
  requiredCredits: number;
  currentBalance: number;
  availableSubscriptions: Product[];
  availableCreditsPacks: Product[];
  userTier?: UserTier;
  handlePurchase: (id: string, credits: number, price: number, kind: 'credits' | 'subscription') => void;
  isProcessing: string | null;
  interval: 'month' | 'year';
  setInterval: (v: 'month' | 'year') => void;
  // These are kept for backward compatibility but will be recalculated
  displayPriceString: string;
  yearlyPrice: number;
  yearlySavings: number;
  pricePerCreditRatio: number;
}

// Helper to calculate display values for a subscription product
function calculateSubDisplayValues(
  sub: Product | null,
  allSubs: Product[],
  interval: 'month' | 'year',
  creditsPacks: Product[]
) {
  if (!sub) {
    return {
      displayPriceString: '$0',
      yearlyPrice: 0,
      yearlySavings: 0,
      pricePerCreditRatio: 0,
    };
  }

  // Find monthly and yearly variants by matching planType (same tier)
  const subPlanType = sub.planType;
  
  // Find subscriptions in the same tier using planType
  const sameTierSubs = subPlanType 
    ? allSubs.filter(p => p.planType === subPlanType)
    : allSubs;
  
  const monthlySub = sameTierSubs.find(p => p.interval === 'month') 
                  || allSubs.find(p => p.interval === 'month');
  
  const yearlySub = sameTierSubs.find(p => p.interval === 'year') 
                 || allSubs.find(p => p.interval === 'year');

  const monthlyPrice = monthlySub ? monthlySub.price / 100 : 0;
  const yearlyPrice = yearlySub ? yearlySub.price / 100 : 0;

  const yearlySavings = monthlyPrice > 0 
    ? Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100) 
    : 0;

  // Use server-computed displayPrice if available (with correct currency symbol)
  const intervalSub = interval === 'year' ? yearlySub : monthlySub;
  const displayPriceString = intervalSub?.displayPrice 
    ?? (Number.isInteger(interval === 'year' ? yearlyPrice / 12 : monthlyPrice) 
      ? `$${interval === 'year' ? yearlyPrice / 12 : monthlyPrice}` 
      : `$${(interval === 'year' ? yearlyPrice / 12 : monthlyPrice).toFixed(2)}`);

  // Calculate price per credit ratio
  const selectedSubForCalc = interval === 'year' ? yearlySub : monthlySub;
  // Use smallest pack for comparison (worst value per credit)
  const sortedPacks = [...creditsPacks].sort((a, b) => (a.creditsAmount ?? 0) - (b.creditsAmount ?? 0));
  const smallPack = sortedPacks[0];
  let pricePerCreditRatio = 0;
  
  if (selectedSubForCalc?.creditsPerMonth && smallPack?.creditsAmount) {
    const creditsPricePerUnit = (smallPack.price / 100) / smallPack.creditsAmount;
    const subMonthlyCost = interval === 'year' ? yearlyPrice / 12 : monthlyPrice;
    const subPricePerUnit = subMonthlyCost / selectedSubForCalc.creditsPerMonth;
    
    if (subPricePerUnit > 0) {
      pricePerCreditRatio = Math.round(creditsPricePerUnit / subPricePerUnit);
    }
  }

  return {
    displayPriceString,
    yearlyPrice,
    yearlySavings,
    pricePerCreditRatio,
    // Return the correct sub for the current interval
    intervalSub: interval === 'year' ? yearlySub : monthlySub,
  };
}

export function StandardFlow({
  isMobile,
  requiredCredits,
  currentBalance,
  availableSubscriptions,
  availableCreditsPacks,
  userTier = 'starter',
  handlePurchase,
  isProcessing,
  interval,
  setInterval,
}: StandardFlowProps) {
  const salesPaused = SALES_PAUSED;
  
  const { primaryRecommendation, secondaryRecommendation } = useUpgradeStrategy(
    userTier,
    availableSubscriptions as Parameters<typeof useUpgradeStrategy>[1],
    availableCreditsPacks as Parameters<typeof useUpgradeStrategy>[2],
    Math.max(0, requiredCredits - currentBalance)
  );

  // Recalculate display values based on the PRIMARY recommendation
  const primaryDisplayValues = calculateSubDisplayValues(
    primaryRecommendation,
    availableSubscriptions,
    interval,
    availableCreditsPacks
  );

  // For subscriptions, we want to use the correct interval variant
  const primarySubToShow = primaryRecommendation?.creditsPerMonth !== undefined 
    ? (primaryDisplayValues.intervalSub || primaryRecommendation)
    : primaryRecommendation;

  return (
    <div className={cn("flex flex-col", isMobile ? "pb-8" : "h-full")}>
      <MicroHeader 
        isMobile={isMobile} 
        requiredCredits={requiredCredits} 
        currentBalance={currentBalance} 
      />
      
      <div className={cn("p-6 pt-2", isMobile ? "flex flex-col gap-4" : "grid md:grid-cols-2 gap-4")}>
        {/* Primary Recommendation */}
        {primarySubToShow && (primarySubToShow.creditsPerMonth !== undefined ? (
           <SubscriptionOption
             selectedSub={primarySubToShow}
             interval={interval}
             setInterval={setInterval}
             displayPriceString={primaryDisplayValues.displayPriceString}
             yearlyPrice={primaryDisplayValues.yearlyPrice}
             yearlySavings={primaryDisplayValues.yearlySavings}
             pricePerCreditRatio={primaryDisplayValues.pricePerCreditRatio}
             isProcessing={isProcessing}
             disabled
             disabledText="Subscriptions temporarily unavailable"
             onPurchase={() => {
               // Ensure we are purchasing the correct product ID for the selected interval
               const productToPurchase = primarySubToShow;
               if (!productToPurchase) return;
               
               handlePurchase(
                 productToPurchase.id, 
                 productToPurchase.creditsPerMonth!, 
                 productToPurchase.price, 
                 'subscription'
               );
             }}
             isMobile={isMobile}
             buttonText={`Upgrade to ${primarySubToShow.name || 'Pro'} Plan`}
           />
        ) : (
           <CreditsPackOption
             recommendedCredits={primarySubToShow}
             isProcessing={isProcessing}
             onPurchase={() => {
               // Similar dynamic handling for packs if needed
               const packToPurchase = primarySubToShow;
               if (!packToPurchase) return;

               handlePurchase(
                 packToPurchase.id, 
                 packToPurchase.creditsAmount!, 
                 packToPurchase.price, 
                 'credits'
               )
             }}
             isMobile={isMobile}
             buttonText={`Get ${primarySubToShow.creditsAmount?.toLocaleString()} Credits`}
             disabled={salesPaused}
             disabledText="Purchases paused"
           />
        ))}

        {/* Divider for Mobile */}
        {isMobile && primarySubToShow && secondaryRecommendation && (
          <div className="flex items-center gap-2 py-1">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground font-medium uppercase">OR</span>
            <div className="h-px bg-border flex-1" />
          </div>
        )}

        {/* Secondary Recommendation */}
        {secondaryRecommendation && (secondaryRecommendation.creditsPerMonth !== undefined ? (
          (() => {
            const secondaryDisplayValues = calculateSubDisplayValues(
              secondaryRecommendation,
              availableSubscriptions,
              interval,
              availableCreditsPacks
            );
            const secondarySubToShow = secondaryDisplayValues.intervalSub || secondaryRecommendation;
            return (
              <SubscriptionOption
                selectedSub={secondarySubToShow}
                interval={interval}
                setInterval={setInterval}
                displayPriceString={secondaryDisplayValues.displayPriceString}
                yearlyPrice={secondaryDisplayValues.yearlyPrice}
                yearlySavings={secondaryDisplayValues.yearlySavings}
                pricePerCreditRatio={secondaryDisplayValues.pricePerCreditRatio}
                isProcessing={isProcessing}
                disabled
                disabledText="Subscriptions temporarily unavailable"
                onPurchase={() => handlePurchase(
                  secondarySubToShow.id, 
                  secondarySubToShow.creditsPerMonth!, 
                  secondarySubToShow.price, 
                  'subscription'
                )}
                isMobile={isMobile}
              />
            );
          })()
        ) : (
           <CreditsPackOption
             recommendedCredits={secondaryRecommendation}
             isProcessing={isProcessing}
             onPurchase={() => handlePurchase(
               secondaryRecommendation.id, 
               secondaryRecommendation.creditsAmount!, 
               secondaryRecommendation.price, 
               'credits'
             )}
             isMobile={isMobile}
             buttonText={`Get ${secondaryRecommendation.creditsAmount?.toLocaleString()} Credits`}
             disabled={salesPaused}
             disabledText="Purchases paused"
           />
        ))}
      </div>
    </div>
  );
}

