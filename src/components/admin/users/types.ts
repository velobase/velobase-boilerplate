/**
 * Shared types for admin user detail components
 */

export interface UserDetailData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  canonicalEmail: string | null
  isAdmin: boolean
  isBlocked: boolean
  hasPurchased: boolean
  createdAt: Date
  // Device & Security info
  deviceKeyAtSignup: string | null
  isPrimaryDeviceAccount: boolean
  signupIp: string | null
  stripeCustomerId: string | null
  // Email status
  emailBounced: boolean
  emailComplained: boolean
  // Ad Tracking
  adClickId: string | null
  adClickProvider: string | null
  adClickTime: Date | null
  // UTM info
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  // Stats
  stats: {
    totalPaidCents: number
    ordersCount: number
    hasUsedProTrial: boolean
    proTrialConverted: boolean
    hitPaywallCount: number
    canBypassBlur: boolean
  } | null
  // Subscription
  subscription: {
    id: string
    planSnapshot: { name?: string; type?: string }
    status: string
    cancelAtPeriodEnd: boolean
    currentCycle: {
      startsAt: Date
      expiresAt: Date
    } | null
  } | null
  // Affiliate
  affiliate: {
    referralCode: string | null
    payoutWallet: string | null
    affiliateEnabledAt: Date | null
    referredBy: {
      id: string
      name: string | null
      email: string | null
    } | null
    referralsCount: number
    balances: {
      pendingCents: number
      availableCents: number
      lockedCents: number
      debtCents: number
    }
    payoutRequests: Array<{
      id: string
      type: string
      status: string
      amountCents: number
      walletAddress: string | null
      txHash: string | null
      createdAt: Date
    }>
  }
}

export interface RelatedUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
  isBlocked: boolean
  isPrimaryDeviceAccount: boolean
  createdAt: Date
}

