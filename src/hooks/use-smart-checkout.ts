'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { usePaymentDialogStore } from '@/stores/payment-dialog-store'
import { FORCE_GATEWAY_SELECTION_FOR_ALL_USERS } from '@/config/payment'
import { SALES_PAUSED } from '@/config/decommission'

interface SmartCheckoutParams {
  productId: string
  amount?: number
  successUrl?: string
  cancelUrl?: string
  metadata?: Record<string, unknown>
  /**
   * Subscription purchase.
   * Note: we may still show the gateway selection dialog depending on user preference / flags.
   */
  isSubscription?: boolean
}

/**
 * Hook for smart checkout based on user's payment preference.
 * - AUTO: Opens payment selection dialog
 * - TELEGRAM_STARS: Open Telegram deep link (bind+pay if needed)
 * - NOWPAYMENTS: Redirects to crypto selection page
 */
export function useSmartCheckout() {
  const router = useRouter()
  const { data: session } = useSession()
  const { openPaymentDialog } = usePaymentDialogStore()
  
  const isLoggedIn = !!session?.user
  
  const { data: preferenceData, isLoading: isLoadingPreference } = 
    api.account.getPaymentGatewayPreference.useQuery(undefined, {
      enabled: isLoggedIn,
    })

  const telegramStatus = api.telegram.getBindingStatus.useQuery(undefined, {
    enabled: isLoggedIn,
  })
  const generateBindPayToken = api.telegram.generateBindPayToken.useMutation()

  const startCheckout = async (params: SmartCheckoutParams) => {
    if (SALES_PAUSED) {
      toast.error('Purchases are temporarily unavailable.')
      return { status: 'ERROR' as const, message: 'Sales temporarily paused' }
    }

    const { productId, amount, successUrl, cancelUrl, metadata, isSubscription } = params
    const preference = preferenceData?.preference ?? 'AUTO'

    // Subscriptions are temporarily disabled (scheme A)
    if (isSubscription) {
      toast.error('Subscriptions are temporarily unavailable. Please buy credits instead.')
      return { status: 'ERROR' as const, message: 'Subscriptions temporarily unavailable' }
    }

    const openTelegram = async () => {
      const botUsername = telegramStatus.data?.botUsername
      if (!botUsername) {
        toast.error('Telegram Bot is not configured')
        return { status: 'ERROR' as const, message: 'Telegram bot not configured' }
      }

      if (telegramStatus.data?.isBound) {
        window.open(`https://t.me/${botUsername}?start=buy_${productId}`, '_blank')
        return { status: 'REDIRECTING' as const }
      }

      try {
        const result = await generateBindPayToken.mutateAsync({ productId })
        window.open(result.deepLink, '_blank')
        return { status: 'REDIRECTING' as const }
      } catch {
        toast.error('Failed to generate payment link. Please try again.')
        return { status: 'ERROR' as const, message: 'Failed to generate payment link' }
      }
    }

    // Non-subscription: when feature flag is on, ALL users see gateway selection dialog.
    if (FORCE_GATEWAY_SELECTION_FOR_ALL_USERS) {
      openPaymentDialog({
        productId,
        amount,
        successUrl,
        cancelUrl,
        metadata,
      })
      return { status: 'DIALOG_OPENED' as const }
    }

    // ====== Fallback: original preference-based logic (when flag is OFF) ======

    // AUTO: Show payment selection dialog
    if (preference === 'AUTO') {
      openPaymentDialog({
        productId,
        amount,
        successUrl,
        cancelUrl,
        metadata,
      })
      return { status: 'DIALOG_OPENED' as const }
    }

    // NOWPAYMENTS: Redirect to crypto selection
    if (preference === 'NOWPAYMENTS') {
      router.push(`/payment/select-crypto?productId=${productId}`)
      return { status: 'REDIRECTING' as const }
    }

    // TELEGRAM_STARS (and legacy STRIPE): Open Telegram deep link
    if (preference === 'TELEGRAM_STARS' || preference === 'STRIPE') {
      return await openTelegram()
    }

    // Unknown preference: fall back to dialog
    openPaymentDialog({
      productId,
      amount,
      successUrl,
      cancelUrl,
      metadata,
    })
    return { status: 'DIALOG_OPENED' as const }
  }

  return {
    startCheckout,
    isLoading: isLoadingPreference || telegramStatus.isLoading || generateBindPayToken.isPending,
    preference: preferenceData?.preference ?? 'AUTO',
  }
}

