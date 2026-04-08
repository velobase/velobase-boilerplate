// User tier type - should match your auth system
export type UserTier = 'starter' | 'plus' | 'premium' | 'enterprise' | 'free';

// Plan type from backend (matches SubscriptionPlan.type in database)
export type PlanType = 'FREE' | 'STARTER' | 'PLUS' | 'PREMIUM';

interface Product {
  id: string;
  name: string;
  price: number;
  creditsAmount?: number; // for packs
  creditsPerMonth?: number; // for subs
  interval?: string | null;
  planType?: PlanType; // Subscription tier from backend
}

interface UpgradeStrategyResult {
  primaryRecommendation: Product | null;
  secondaryRecommendation: Product | null;
  strategyName: string;
}

/**
 * Find subscriptions by plan type
 */
function findSubscriptionsByPlanType(
  subscriptions: Product[],
  planType: PlanType
): Product[] {
  return subscriptions.filter(p => p.planType === planType);
}

/**
 * Get the yearly variant of a subscription (better value)
 */
function getYearlyVariant(subs: Product[]): Product | null {
  return subs.find(p => p.interval === 'year') || subs[0] || null;
}

/**
 * Strategy engine: recommend products based on user's current tier
 * 
 * Rules:
 * - Starter/Free users -> Recommend Plus subscription
 * - Plus users -> Recommend Premium subscription  
 * - Premium users -> Recommend credits packs (already at top tier)
 */
export function useUpgradeStrategy(
  userTier: UserTier,
  availableSubscriptions: Product[],
  availableCreditsPacks: Product[],
  missingCredits: number
): UpgradeStrategyResult {
  // Sort packs by credits (ascending) for easier selection
  const sortedPacks = [...availableCreditsPacks].sort(
    (a, b) => (a.creditsAmount ?? 0) - (b.creditsAmount ?? 0)
  );

  // 1. STARTER/FREE -> Recommend PLUS subscription
  if (userTier === 'starter' || userTier === 'free') {
    const plusSubs = findSubscriptionsByPlanType(availableSubscriptions, 'PLUS');
    const recommendedSub = getYearlyVariant(plusSubs);
    
    // Secondary: We recommend the $9.99 pack (approx 5000 credits) as the "Decoy".
    // Psychology: $4.99 is too cheap (easy exit), $29 is too expensive (competes with sub).
    // $9.99 is painful enough to make the $39 sub look like great value (6x credits for 4x price).
    const decoyPack = sortedPacks.find(p => p.price >= 900 && p.price <= 1500) // Look for ~$9.99
                   || sortedPacks.find(p => (p.creditsAmount ?? 0) >= missingCredits) // Fallback to minimal need
                   || sortedPacks[0] 
                   || null;

    return {
      primaryRecommendation: recommendedSub || availableSubscriptions[0] || null,
      secondaryRecommendation: decoyPack,
      strategyName: 'upgrade_to_plus'
    };
  }

  // 2. PLUS -> Recommend PREMIUM subscription
  if (userTier === 'plus') {
    const premiumSubs = findSubscriptionsByPlanType(availableSubscriptions, 'PREMIUM');
    const recommendedSub = getYearlyVariant(premiumSubs);
    
    // Secondary: medium credits pack
    const midPack = sortedPacks.find(p => (p.creditsAmount ?? 0) >= 5000) 
                 || sortedPacks[sortedPacks.length - 1] 
                 || null;

    return {
      primaryRecommendation: recommendedSub || availableSubscriptions[0] || null,
      secondaryRecommendation: midPack,
      strategyName: 'upgrade_to_premium'
    };
  }

  // 3. PREMIUM/ENTERPRISE -> Recommend CREDITS PACKS (already at top tier)
  if (userTier === 'premium' || userTier === 'enterprise') {
    // Recommend the largest pack first
    const largePack = sortedPacks[sortedPacks.length - 1] || null;
    const midPack = sortedPacks.find(p => (p.creditsAmount ?? 0) >= 5000 && p !== largePack) 
                 || sortedPacks[0] 
                 || null;

    return {
      primaryRecommendation: largePack,
      secondaryRecommendation: midPack,
      strategyName: 'top_up_credits'
    };
  }

  // Fallback
  return {
    primaryRecommendation: availableSubscriptions[0] || sortedPacks[0] || null,
    secondaryRecommendation: sortedPacks[0] || null,
    strategyName: 'fallback'
  };
}
