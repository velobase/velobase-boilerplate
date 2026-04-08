/* eslint-disable no-console */
import { PrismaClient, type Prisma, type ProductType, type ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ==============================================================================
 * 1. PRICING CONFIGURATION (SOURCE OF TRUTH)
 * ==============================================================================
 */

const ENTITLEMENTS = {
  PRIORITY_QUEUE: {
    id: 'ent-priority-queue',
    key: 'priority_queue',
    name: 'Priority Queue',
    description: 'Skip the queue for faster processing',
    type: 'BOOLEAN',
  },
  NO_WATERMARK: {
    id: 'ent-no-watermark',
    key: 'no_watermark',
    name: 'No Watermark',
    description: 'Output without watermark',
    type: 'BOOLEAN',
  },
  COMMERCIAL_LICENSE: {
    id: 'ent-commercial-license',
    key: 'commercial_license',
    name: 'Commercial License',
    description: 'Use generated content for commercial purposes',
    type: 'BOOLEAN',
  },
  EXPORT_4K: {
    id: 'ent-4k-export',
    key: '4k_export',
    name: 'High Quality Export',
    description: 'Export in high quality',
    type: 'BOOLEAN',
  },
  DAILY_CREDITS: {
    id: 'ent-daily-credits',
    key: 'daily_credits',
    name: 'Daily Credits',
    description: 'Daily drip credits for free plan',
    type: 'LIMIT',
  },
} as const;

interface SubscriptionConfig {
  plan: {
    id: string;
    type: 'FREE' | 'STARTER' | 'PLUS' | 'PREMIUM';
    name: string;
    interval: 'MONTH' | 'YEAR' | 'WEEK';
    creditsPerPeriod: number; // Credits per billing period (week/month/year)
    entitlements: { id: string; value: Prisma.InputJsonValue }[];
  };
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice: number;
    description: Prisma.InputJsonValue;
    status: 'ACTIVE' | 'INACTIVE';
    isAvailable: boolean;
    sortOrder: number;
    metadata?: Prisma.InputJsonValue;
    // Trial specific
    hasTrial?: boolean;
    trialDays?: number;
    trialCreditsAmount?: number;
  };
}

const SUBSCRIPTION_TIERS: SubscriptionConfig[] = [
  // --------------------------------------------------------------------------
  // FREE TIER
  // --------------------------------------------------------------------------
  {
    plan: {
      id: 'plan-free-001',
      type: 'FREE',
      name: 'Free Plan',
      interval: 'MONTH',
      creditsPerPeriod: 9000, // 9000 credits per month
      entitlements: [
        { id: 'pe-free-daily-credits', value: 300 },
      ],
    },
    product: {
      id: 'prod-free-001',
      name: 'Free',
      price: 0,
      originalPrice: 0,
      description: {
        en: 'Get started for free.',
        subtitle: 'Perfect for trying out',
        features: ['300 credits daily', 'Standard quality', 'Watermark included'],
      },
      status: 'ACTIVE',
      isAvailable: true,
      sortOrder: 1,
    },
  },

  // --------------------------------------------------------------------------
  // STARTER TIER (WEEKLY)
  // --------------------------------------------------------------------------
  {
    plan: {
      id: 'plan-starter-weekly-001',
      type: 'STARTER',
      name: 'Creator',
      interval: 'WEEK',
      creditsPerPeriod: 2300, // 2300 credits per week (not per month!)
      entitlements: [
        { id: 'pe-starter-weekly-priority', value: true },
        { id: 'pe-starter-weekly-watermark', value: true },
        { id: 'pe-starter-weekly-commercial', value: true },
      ],
    },
    product: {
      id: 'prod-unlock-weekly-499',
      name: 'Creator',
      price: 499,
      originalPrice: 999, // Anchor price for UI: ~~$9.99~~ $4.99
      description: {
        en: 'Flexible weekly access.',
        subtitle: 'Great for short projects',
        badge: '50% OFF',
        features: ['2,300 credits per week', 'Cancel anytime', 'Commercial license'],
      },
      status: 'ACTIVE',
      isAvailable: true,
      sortOrder: 100,
      metadata: {
        useCase: 'upgrade_drawer',
        offerType: 'NEW_USER_UNLOCK',
        crypto: {
          enabled: true,
          feeRate: 0, // No fee for $4.99 weekly
          label: 'crypto processing fee',
        },
      },
    },
  },
  // Starter Weekly (Standard) - Anchor / Fallback ($9.99)
  {
    plan: {
      id: 'plan-starter-weekly-001',
      type: 'STARTER',
      name: 'Creator',
      interval: 'WEEK',
      creditsPerPeriod: 2300,
      entitlements: [
        { id: 'pe-starter-weekly-priority', value: true },
        { id: 'pe-starter-weekly-watermark', value: true },
        { id: 'pe-starter-weekly-commercial', value: true },
      ],
    },
    product: {
      id: 'prod-unlock-weekly-999',
      name: 'Creator',
      price: 999,
      originalPrice: 999,
      description: {
        en: 'Standard weekly access.',
        subtitle: 'For short projects',
        badge: 'STANDARD',
        features: ['2,300 credits per week', 'Cancel anytime', 'Commercial license'],
      },
      status: 'ACTIVE',
      isAvailable: true,
      sortOrder: 101,
      metadata: {
        useCase: 'upgrade_drawer_anchor',
        crypto: {
          enabled: true,
          feeRate: 0.098, // 9.8%
          label: '9.8% crypto processing fee',
        },
      },
    },
  },

  // --------------------------------------------------------------------------
  // PLUS TIER (PRO) - MONTHLY ($39) & YEARLY ($348)
  // --------------------------------------------------------------------------
  {
    plan: {
      id: 'plan-plus-monthly-001',
      type: 'PLUS',
      name: 'Pro Monthly',
      interval: 'MONTH',
      creditsPerPeriod: 30000, // 30k credits per month
      entitlements: [
        { id: 'pe-plus-monthly-priority', value: true },
        { id: 'pe-plus-monthly-watermark', value: true },
        { id: 'pe-plus-monthly-commercial', value: true },
      ],
    },
    product: {
      id: 'prod-plus-monthly-001',
      name: 'Pro',
      price: 3900,
      originalPrice: 3900,
      description: {
        en: 'Unlimited power for creators.',
        subtitle: 'Everything in Free, plus:',
        badge: 'POPULAR',
        features: ['30,000 credits per month', 'Priority queue', 'No watermarks', 'Commercial usage rights', 'HD quality'],
      },
      status: 'ACTIVE',
      isAvailable: true,
      sortOrder: 2,
      metadata: {
        crypto: {
          enabled: true,
          feeRate: 0.064, // 6.4%
          label: '6.4% crypto processing fee',
        },
      },
    },
  },
  {
    plan: {
      id: 'plan-plus-yearly-001',
      type: 'PLUS',
      name: 'Pro Yearly',
      interval: 'YEAR',
      creditsPerPeriod: 30000, // 30k credits per month (360k total per year, but granted monthly)
      entitlements: [
        { id: 'pe-plus-yearly-priority', value: true },
        { id: 'pe-plus-yearly-watermark', value: true },
        { id: 'pe-plus-yearly-commercial', value: true },
      ],
    },
    product: {
      id: 'prod-plus-yearly-001',
      name: 'Pro',
      price: 34800,
      originalPrice: 46800,
      description: {
        en: 'Best value for serious creators.',
        subtitle: 'Everything in Free, plus:',
        badge: 'SAVE 26%',
        pricingNote: '$29/month billed yearly ($348). $39 if billed monthly.',
        features: ['30,000 credits per month', 'Priority queue', 'No watermarks', 'Commercial usage rights', 'HD quality'],
      },
      status: 'ACTIVE',
      isAvailable: true,
      sortOrder: 3,
      metadata: {
        crypto: {
          enabled: true,
          feeRate: 0.026, // 2.6%
          label: '2.6% crypto processing fee',
        },
      },
    },
  },

  // --------------------------------------------------------------------------
  // PREMIUM TIER - MONTHLY ($99) & YEARLY ($948)
  // --------------------------------------------------------------------------
  {
    plan: {
      id: 'plan-premium-monthly-001',
      type: 'PREMIUM',
      name: 'Premium Monthly',
      interval: 'MONTH',
      creditsPerPeriod: 100000, // 100k credits per month
      entitlements: [
        { id: 'pe-premium-monthly-priority', value: true },
        { id: 'pe-premium-monthly-watermark', value: true },
        { id: 'pe-premium-monthly-commercial', value: true },
        { id: 'pe-premium-monthly-4k', value: true },
      ],
    },
    product: {
      id: 'prod-premium-monthly-001',
      name: 'Premium',
      price: 9900,
      originalPrice: 9900,
      description: {
        en: 'Maximum power for professionals.',
        subtitle: 'Everything in Pro, plus:',
        features: ['100,000 credits per month', 'High Quality export', 'API access', 'Dedicated support'],
      },
      status: 'ACTIVE',
      isAvailable: true,
      sortOrder: 4,
      metadata: {
        crypto: {
          enabled: true,
          feeRate: 0.042, // 4.2%
          label: '4.2% crypto processing fee',
        },
      },
    },
  },
  {
    plan: {
      id: 'plan-premium-yearly-001',
      type: 'PREMIUM',
      name: 'Premium Yearly',
      interval: 'YEAR',
      creditsPerPeriod: 100000, // 100k credits per month (1.2M total per year, but granted monthly)
      entitlements: [
        { id: 'pe-premium-yearly-priority', value: true },
        { id: 'pe-premium-yearly-watermark', value: true },
        { id: 'pe-premium-yearly-commercial', value: true },
        { id: 'pe-premium-yearly-4k', value: true },
      ],
    },
    product: {
      id: 'prod-premium-yearly-001',
      name: 'Premium',
      price: 94800,
      originalPrice: 118800,
      description: {
        en: 'Maximum power for professionals.',
        subtitle: 'Everything in Pro, plus:',
        badge: 'SAVE 20%',
        pricingNote: '$79/month billed yearly ($948). $99 if billed monthly.',
        features: ['100,000 credits per month', 'High Quality export', 'API access', 'Dedicated support'],
      },
      status: 'ACTIVE',
      isAvailable: true,
      sortOrder: 5,
      metadata: {
        crypto: {
          enabled: true,
          feeRate: 0.02, // 2.0%
          label: '2.0% crypto processing fee',
        },
      },
    },
  },
];

const LEGACY_AND_SPECIAL_TIERS: SubscriptionConfig[] = [
  // --------------------------------------------------------------------------
  // LEGACY / SPECIAL PRODUCTS
  // --------------------------------------------------------------------------
  
  // Pro Trial (Download Paywall)
  {
    plan: { id: 'plan-plus-monthly-001', type: 'PLUS', name: 'Pro Monthly', interval: 'MONTH', creditsPerPeriod: 30000, entitlements: [] }, // Reuse plan
    product: {
      id: 'prod-plus-monthly-trial-3d',
      name: 'Pro Trial',
      price: 2990,
      originalPrice: 2990,
      description: {
        en: 'Start your Pro journey with a 3-day free trial.',
        subtitle: 'Try Pro risk-free:',
        badge: '3-DAY FREE TRIAL',
        features: ['1,000 trial credits', 'Full 30,000 credits after trial', 'Commercial usage rights'],
      },
      status: 'ACTIVE',
      isAvailable: true,
      sortOrder: 100,
      hasTrial: true,
      trialDays: 3,
      trialCreditsAmount: 1000,
      metadata: { useCase: 'download_paywall' },
    },
  },
  // Unlock Drawer: Elite Monthly ($39.90, 40K credits) - REMOVED
  // Strategy decision: Remove intermediate/confusing tiers. Funnel users to $4.99 Weekly or $39 Pro.
];

const CREDITS_PACKAGES = [
  {
    id: 'prod-credits-atomic-001',
    name: 'Mini Pack',
    credits: 1500,
    price: 499,
    originalPrice: 599,
    description: { en: 'Best for getting started', features: ['1,500 credits', 'Never expires'] },
    sortOrder: 10,
    metadata: {
      crypto: {
        enabled: true,
        feeRate: 0.128, // 12.8% - small amount, higher fee
        label: 'Crypto processing fee',
      },
    },
  },
  {
    id: 'prod-credits-starter-001',
    name: 'Starter Pack',
    credits: 5000,
    price: 999,
    originalPrice: 1299,
    description: { en: 'Perfect for quick projects', features: ['5,000 credits', 'Never expires'] },
    sortOrder: 11,
    metadata: {
      crypto: {
        enabled: true,
        feeRate: 0.098, // 9.8%
        label: 'Crypto processing fee',
      },
    },
  },
  {
    id: 'prod-credits-popular-001',
    name: 'Creator Pack',
    credits: 20000,
    price: 2900,
    originalPrice: 3999,
    description: { en: 'Best value for creators', badge: 'BEST VALUE', features: ['20,000 credits', 'Never expires', 'Save 27%'] },
    sortOrder: 12,
    metadata: {
      crypto: {
        enabled: true,
        feeRate: 0.064, // 6.4% - larger amount, lower fee
        label: 'Crypto processing fee',
      },
    },
  },
  {
    id: 'prod-credits-studio-001',
    name: 'Studio Pack',
    credits: 50000,
    price: 6900,
    originalPrice: 9900,
    description: { en: 'Massive credits for heavy users', badge: 'PRO CHOICE', features: ['50,000 credits', 'Never expires', 'Save 30%'] },
    sortOrder: 13,
    metadata: {
      crypto: {
        enabled: true,
        feeRate: 0.042, // 4.2% - aligned with Premium tier
        label: 'Crypto processing fee',
      },
    },
  },
];

const ONE_TIME_PRODUCTS = [
  {
    id: 'prod-single-download-001',
    name: 'Single Download',
    price: 99,
    originalPrice: 99,
    description: { en: 'Download without watermark', features: ['Remove watermark', 'High quality download', 'Commercial license'] },
    type: 'ONE_TIME_ENTITLEMENT',
    status: 'ACTIVE',
    isAvailable: true,
    sortOrder: 20,
    metadata: { useCase: 'download_paywall' },
  },
];

/**
 * ==============================================================================
 * 2. MULTI-CURRENCY PRICING CONFIGURATION
 * ==============================================================================
 * 
 * Strategy:
 * - EUR: ~1:1 with USD or slightly lower (psychological pricing)
 * - GBP: ~80% of USD (stronger currency)
 * - CHF: ~1:1 with USD (Swiss Franc is strong but we keep parity for simplicity)
 * 
 * All prices in smallest currency unit (cents/pence)
 */
type CurrencyCode = 'EUR' | 'GBP' | 'CHF' | 'AUD';

interface MultiCurrencyPrice {
  amount: number;        // Price in smallest unit
  originalAmount: number; // Original price for discount display
}

// Product ID -> Currency -> Price mapping
const MULTI_CURRENCY_PRICES: Record<string, Partial<Record<CurrencyCode, MultiCurrencyPrice>>> = {
  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================
  
  // Weekly Creator $4.99 -> €4.99 / £3.99 / CHF 4.99 / A$7.99
  'prod-unlock-weekly-499': {
    EUR: { amount: 499, originalAmount: 999 },
    GBP: { amount: 399, originalAmount: 799 },
    CHF: { amount: 499, originalAmount: 999 },
    AUD: { amount: 799, originalAmount: 1599 },
  },
  // Weekly Creator Standard $9.99 -> €9.99 / £7.99 / CHF 9.99 / A$15.99
  'prod-unlock-weekly-999': {
    EUR: { amount: 999, originalAmount: 999 },
    GBP: { amount: 799, originalAmount: 799 },
    CHF: { amount: 999, originalAmount: 999 },
    AUD: { amount: 1599, originalAmount: 1599 },
  },
  // Pro Monthly $39 -> €39 / £32 / CHF 39 / A$59.00
  'prod-plus-monthly-001': {
    EUR: { amount: 3900, originalAmount: 3900 },
    GBP: { amount: 3200, originalAmount: 3200 },
    CHF: { amount: 3900, originalAmount: 3900 },
    AUD: { amount: 5900, originalAmount: 5900 },
  },
  // Pro Yearly $348 -> €348 / £276 / CHF 348 / A$540.00
  // GBP: £276/year ÷ 12 = £23/mo (clean number for UI)
  'prod-plus-yearly-001': {
    EUR: { amount: 34800, originalAmount: 46800 },
    GBP: { amount: 27600, originalAmount: 37200 },
    CHF: { amount: 34800, originalAmount: 46800 },
    AUD: { amount: 54000, originalAmount: 72000 },
  },
  // Premium Monthly $99 -> €99 / £79 / CHF 99 / A$149.00
  'prod-premium-monthly-001': {
    EUR: { amount: 9900, originalAmount: 9900 },
    GBP: { amount: 7900, originalAmount: 7900 },
    CHF: { amount: 9900, originalAmount: 9900 },
    AUD: { amount: 14900, originalAmount: 14900 },
  },
  // Premium Yearly $948 -> €948 / £756 / CHF 948 / A$1450.00
  // GBP: £756/year ÷ 12 = £63/mo (clean number for UI)
  'prod-premium-yearly-001': {
    EUR: { amount: 94800, originalAmount: 118800 },
    GBP: { amount: 75600, originalAmount: 94800 },
    CHF: { amount: 94800, originalAmount: 118800 },
    AUD: { amount: 145000, originalAmount: 180000 },
  },
  // Pro Trial $29.90 -> €29.90 / £24.90 / CHF 29.90 / A$45.90
  'prod-plus-monthly-trial-3d': {
    EUR: { amount: 2990, originalAmount: 2990 },
    GBP: { amount: 2490, originalAmount: 2490 },
    CHF: { amount: 2990, originalAmount: 2990 },
    AUD: { amount: 4590, originalAmount: 4590 },
  },

  // ============================================================================
  // CREDITS PACKAGES
  // ============================================================================
  
  // Mini Pack $4.99 -> €4.99 / £3.99 / CHF 4.99 / A$7.99
  // Original: $5.99 -> €5.99 / £4.99 / CHF 5.99 / A$9.99
  'prod-credits-atomic-001': {
    EUR: { amount: 499, originalAmount: 599 },
    GBP: { amount: 399, originalAmount: 499 },
    CHF: { amount: 499, originalAmount: 599 },
    AUD: { amount: 799, originalAmount: 999 },
  },
  // Starter Pack $9.99 -> €9.99 / £7.99 / CHF 9.99 / A$15.99
  // Original: $12.99 -> €12.99 / £10.99 / CHF 12.99 / A$20.99
  'prod-credits-starter-001': {
    EUR: { amount: 999, originalAmount: 1299 },
    GBP: { amount: 799, originalAmount: 1099 },
    CHF: { amount: 999, originalAmount: 1299 },
    AUD: { amount: 1599, originalAmount: 2099 },
  },
  // Creator Pack $29 -> €29 / £23 / CHF 29 / A$45.00
  // Original: $39.99 -> €39.99 / £31.99 / CHF 39.99 / A$62.99
  'prod-credits-popular-001': {
    EUR: { amount: 2900, originalAmount: 3999 },
    GBP: { amount: 2300, originalAmount: 3199 },
    CHF: { amount: 2900, originalAmount: 3999 },
    AUD: { amount: 4500, originalAmount: 6299 },
  },
  // Studio Pack $69 -> €69 / £54 / CHF 69 / A$109.00
  'prod-credits-studio-001': {
    EUR: { amount: 6900, originalAmount: 9900 },
    GBP: { amount: 5400, originalAmount: 7800 },
    CHF: { amount: 6900, originalAmount: 9900 },
    AUD: { amount: 10900, originalAmount: 15500 },
  },

  // ============================================================================
  // ONE-TIME PRODUCTS
  // ============================================================================
  
  // Single Download $0.99 -> €0.99 / £0.79 / CHF 0.99 / A$1.59
  'prod-single-download-001': {
    EUR: { amount: 99, originalAmount: 99 },
    GBP: { amount: 79, originalAmount: 79 },
    CHF: { amount: 99, originalAmount: 99 },
    AUD: { amount: 159, originalAmount: 159 },
  },
};

const SUPPORTED_CURRENCIES: CurrencyCode[] = ['EUR', 'GBP', 'CHF', 'AUD'];

export async function seedProducts() {
  console.log('📦 Starting product seeding...');

  // Track all seeded product IDs to cleanup old ones
  const seededProductIds = new Set<string>();

  // 1. Create Entitlements
  console.log('  Creating entitlements...');
  for (const ent of Object.values(ENTITLEMENTS)) {
    await prisma.entitlement.upsert({
      where: { key: ent.key },
      update: {
        type: ent.type,
        name: ent.name,
        description: ent.description,
      },
      create: {
        id: ent.id,
        key: ent.key,
        type: ent.type,
        status: 'ACTIVE',
        name: ent.name,
        description: ent.description,
      },
    });
  }

  // 2. Create Subscription Plans & Products (Main + Legacy)
  console.log('  Creating subscription plans and products...');
  const allSubs = [...SUBSCRIPTION_TIERS, ...LEGACY_AND_SPECIAL_TIERS];
  
  // Use a map to avoid re-upserting the same Plan multiple times if shared
  const processedPlans = new Set<string>();

  for (const config of allSubs) {
    // 2.1 Upsert Plan (if not processed)
    if (!processedPlans.has(config.plan.id)) {
      await prisma.subscriptionPlan.upsert({
        where: { id: config.plan.id },
        create: {
          id: config.plan.id,
          type: config.plan.type,
          name: config.plan.name,
          status: 'ACTIVE',
          interval: config.plan.interval,
          intervalCount: 1,
          creditsPerPeriod: config.plan.creditsPerPeriod,
          creditsPerMonth: config.plan.creditsPerPeriod, // Keep for backward compatibility
        },
        update: {
          type: config.plan.type,
          name: config.plan.name,
          interval: config.plan.interval,
          creditsPerPeriod: config.plan.creditsPerPeriod,
          creditsPerMonth: config.plan.creditsPerPeriod, // Keep synced for backward compatibility
        },
      });

      // 2.2 Upsert Plan Entitlements
      for (const ent of config.plan.entitlements) {
        // Map entitlement key/id to actual DB ID from our constant
        // Note: The ent.id in config is the 'plan_entitlement.id'. 
        
        let entitlementId = '';
        if (ent.id.includes('priority')) entitlementId = ENTITLEMENTS.PRIORITY_QUEUE.id;
        else if (ent.id.includes('watermark')) entitlementId = ENTITLEMENTS.NO_WATERMARK.id;
        else if (ent.id.includes('commercial')) entitlementId = ENTITLEMENTS.COMMERCIAL_LICENSE.id;
        else if (ent.id.includes('4k')) entitlementId = ENTITLEMENTS.EXPORT_4K.id;
        else if (ent.id.includes('daily-credits')) entitlementId = ENTITLEMENTS.DAILY_CREDITS.id;

        if (entitlementId) {
            await prisma.planEntitlement.upsert({
                where: { id: ent.id },
                update: { value: ent.value },
                create: {
                    id: ent.id,
                    planId: config.plan.id,
                    entitlementId: entitlementId,
                    value: ent.value,
                }
            });
        }
      }
      processedPlans.add(config.plan.id);
    }

    // 2.3 Upsert Product
    await prisma.product.upsert({
      where: { id: config.product.id },
      create: {
        id: config.product.id,
        // ...
        name: config.product.name,
        description: config.product.description,
        price: config.product.price,
        originalPrice: config.product.originalPrice,
        currency: 'usd',
        type: 'SUBSCRIPTION',
        interval: config.plan.interval === 'WEEK' ? 'week' : (config.plan.interval === 'YEAR' ? 'year' : 'month'),
        status: config.product.status,
        isAvailable: config.product.isAvailable,
        sortOrder: config.product.sortOrder,
        metadata: config.product.metadata,
        hasTrial: config.product.hasTrial,
        trialDays: config.product.trialDays,
        trialCreditsAmount: config.product.trialCreditsAmount,
      },
      update: {
        name: config.product.name,
        description: config.product.description,
        price: config.product.price,
        originalPrice: config.product.originalPrice,
        interval: config.plan.interval === 'WEEK' ? 'week' : (config.plan.interval === 'YEAR' ? 'year' : 'month'),
        status: config.product.status,
        isAvailable: config.product.isAvailable,
        sortOrder: config.product.sortOrder,
        metadata: config.product.metadata,
        hasTrial: config.product.hasTrial,
        trialDays: config.product.trialDays,
        trialCreditsAmount: config.product.trialCreditsAmount,
      },
    });
    seededProductIds.add(config.product.id);

    // 2.4 Link Product to Plan
    await prisma.productSubscription.upsert({
      where: { productId: config.product.id },
      create: {
        productId: config.product.id,
        planId: config.plan.id,
      },
      update: {
        planId: config.plan.id,
      },
    });
  }

  // 3. Create Credits Packages
  console.log('  Creating credits packages...');
  for (const pkg of CREDITS_PACKAGES) {
    const product = await prisma.product.upsert({
      where: { id: pkg.id },
      create: {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description as Prisma.InputJsonValue,
        price: pkg.price,
        originalPrice: pkg.originalPrice,
        currency: 'usd',
        type: 'CREDITS_PACKAGE',
        status: 'ACTIVE',
        isAvailable: true,
        sortOrder: pkg.sortOrder,
        metadata: pkg.metadata as Prisma.InputJsonValue,
      },
      update: {
        name: pkg.name,
        description: pkg.description as Prisma.InputJsonValue,
        price: pkg.price,
        originalPrice: pkg.originalPrice,
        sortOrder: pkg.sortOrder,
        metadata: pkg.metadata as Prisma.InputJsonValue,
      },
    });
    seededProductIds.add(pkg.id);

    await prisma.productCreditsPackage.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        creditsAmount: pkg.credits,
      },
      update: {
        creditsAmount: pkg.credits,
      },
    });
  }

  // 4. Create One-Time Products
  console.log('  Creating one-time products...');
  for (const item of ONE_TIME_PRODUCTS) {
    await prisma.product.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: item.name,
        description: item.description as Prisma.InputJsonValue,
        price: item.price,
        originalPrice: item.originalPrice,
        currency: 'usd',
        type: item.type as ProductType,
        status: item.status as ProductStatus,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
        metadata: item.metadata as Prisma.InputJsonValue,
      },
      update: {
        name: item.name,
        description: item.description as Prisma.InputJsonValue,
        price: item.price,
        originalPrice: item.originalPrice,
        status: item.status as ProductStatus,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
        metadata: item.metadata as Prisma.InputJsonValue,
      },
    });
    seededProductIds.add(item.id);
  }

  // 5. Cleanup Old Products
  console.log('  Cleaning up old products...');
  const allActiveProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true }
  });

  for (const prod of allActiveProducts) {
    if (!seededProductIds.has(prod.id)) {
      console.log(`  Deactivating old product: ${prod.name} (${prod.id})`);
      await prisma.product.update({
        where: { id: prod.id },
        data: { status: 'INACTIVE', isAvailable: false }
      });
    }
  }

  // 6. Create Multi-Currency Prices
  console.log('  Creating multi-currency prices...');
  for (const productId of seededProductIds) {
    const currencyPrices = MULTI_CURRENCY_PRICES[productId];
    if (!currencyPrices) continue;

    for (const currency of SUPPORTED_CURRENCIES) {
      const priceConfig = currencyPrices[currency];
      if (!priceConfig) continue;

      await prisma.productPrice.upsert({
        where: {
          productId_currency: {
            productId,
            currency,
          },
        },
        create: {
          productId,
          currency,
          amount: priceConfig.amount,
          originalAmount: priceConfig.originalAmount,
        },
        update: {
          amount: priceConfig.amount,
          originalAmount: priceConfig.originalAmount,
        },
      });
    }
  }
  console.log(`  Created prices for ${Object.keys(MULTI_CURRENCY_PRICES).length} products in ${SUPPORTED_CURRENCIES.length} currencies`);

  console.log('✓ Product seeding completed!');
}

// Run standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProducts()
    .catch((e) => {
      console.error('❌ Error seeding products:', e);
      process.exit(1);
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
