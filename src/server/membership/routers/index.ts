import { z } from 'zod'
import { protectedProcedure, createTRPCRouter } from '@/server/api/trpc'
import { CreateSubscriptionParamsSchema, CreateSubscriptionCycleParamsSchema, GetSubscriptionStatusParamsSchema } from '../schemas'
import { createSubscription } from '../services/create-subscription'
import { createSubscriptionCycle } from '../services/create-subscription-cycle'
import { getSubscriptionStatus } from '../services/get-subscription-status'
import { earlyConvertTrial } from '../services/early-convert-trial'
import { cancelSubscriptionNow } from '../services/cancel-subscription-now'
import {
  getAirwallexSubscriptionForPortal,
  setAirwallexCancelAtPeriodEnd,
  createAirwallexBillingCheckoutSetup,
  listAirwallexInvoicesBySubscription,
} from '@/server/order/providers/airwallex'
import { db } from '@/server/db'

export const membershipRouter = createTRPCRouter({
  createSubscription: protectedProcedure.input(CreateSubscriptionParamsSchema).mutation(({ input }) => createSubscription(input)),
  createSubscriptionCycle: protectedProcedure.input(CreateSubscriptionCycleParamsSchema).mutation(({ input }) => createSubscriptionCycle(input)),
  getSubscriptionStatus: protectedProcedure.input(GetSubscriptionStatusParamsSchema).query(({ input }) => getSubscriptionStatus(input)),
  earlyConvertTrial: protectedProcedure.mutation(async ({ ctx }) =>
    earlyConvertTrial({ userId: ctx.session.user.id })
  ),

  // ============================================================================
  // Airwallex Portal APIs
  // ============================================================================

  /** Get current user's Airwallex subscription details (from gateway + local DB) */
  getAirwallexPortalData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id

    // Find the user's active Airwallex subscription
    const userSub = await db.userSubscription.findFirst({
      where: {
        userId,
        deletedAt: null,
        gateway: 'AIRWALLEX',
        gatewaySubscriptionId: { not: '' },
        status: { in: ['ACTIVE', 'PAST_DUE', 'UNPAID', 'TRIALING'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        cycles: {
          where: { status: 'ACTIVE' },
          orderBy: { sequenceNumber: 'desc' },
          take: 1,
        },
      },
    })

    if (!userSub) {
      return { hasSubscription: false as const }
    }

    // Fetch live data from Airwallex
    const gatewaySub = await getAirwallexSubscriptionForPortal(userSub.gatewaySubscriptionId)

    // Fetch recent invoices
    const invoices = await listAirwallexInvoicesBySubscription({ gatewaySubscriptionId: userSub.gatewaySubscriptionId, pageSize: 20 })

    const currentCycle = userSub.cycles[0] ?? null
    const planSnapshot = userSub.planSnapshot as unknown
    const planName =
      typeof planSnapshot === 'object' && planSnapshot !== null && 'name' in planSnapshot && typeof (planSnapshot as { name?: unknown }).name === 'string'
        ? (planSnapshot as { name: string }).name
        : 'Subscription'
    const planType =
      typeof planSnapshot === 'object' && planSnapshot !== null && 'type' in planSnapshot && typeof (planSnapshot as { type?: unknown }).type === 'string'
        ? (planSnapshot as { type: string }).type
        : null

    return {
      hasSubscription: true as const,
      subscription: {
        id: userSub.id,
        gatewaySubscriptionId: userSub.gatewaySubscriptionId,
        status: gatewaySub?.status && gatewaySub.status !== 'UNKNOWN' ? gatewaySub.status : userSub.status,
        cancelAtPeriodEnd: gatewaySub?.cancelAtPeriodEnd ?? userSub.cancelAtPeriodEnd,
        currentPeriodEndsAt: gatewaySub?.currentPeriodEndsAt ?? currentCycle?.expiresAt ?? null,
        planName,
        planType,
      },
      invoices: invoices.slice(0, 10).map((inv) => ({
        id: inv.id,
        number: inv.number,
        totalAmount: inv.totalAmount,
        currency: inv.currency,
        status: inv.status,
        paymentStatus: inv.paymentStatus,
        hostedUrl: inv.hostedUrl,
        pdfUrl: inv.pdfUrl ?? null,
        createdAt: inv.createdAt ?? null,
      })),
    }
  }),

  /** Toggle cancel at period end (cancel / resume) */
  airwallexSetCancelAtPeriodEnd: protectedProcedure
    .input(z.object({ cancel: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const userSub = await db.userSubscription.findFirst({
        where: {
          userId,
          deletedAt: null,
          gateway: 'AIRWALLEX',
          gatewaySubscriptionId: { not: '' },
          status: { in: ['ACTIVE', 'PAST_DUE', 'UNPAID', 'TRIALING'] },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!userSub) {
        throw new Error('No active Airwallex subscription found')
      }

      // Update on gateway
      const result = await setAirwallexCancelAtPeriodEnd(userSub.gatewaySubscriptionId, input.cancel)
      if (!result.success) throw new Error(result.error ?? 'Failed to update subscription')

      // Sync to local DB
      await db.userSubscription.update({
        where: { id: userSub.id },
        data: {
          cancelAtPeriodEnd: input.cancel,
          canceledAt: input.cancel ? new Date() : null,
        },
      })

      return { success: true }
    }),

  /** Cancel subscription immediately */
  airwallexCancelNow: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id

    const userSub = await db.userSubscription.findFirst({
      where: {
        userId,
        deletedAt: null,
        gateway: 'AIRWALLEX',
        gatewaySubscriptionId: { not: '' },
        status: { in: ['ACTIVE', 'PAST_DUE', 'UNPAID', 'TRIALING'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!userSub) {
      throw new Error('No active Airwallex subscription found')
    }

    // This will cancel on gateway + update local DB
    await cancelSubscriptionNow({ subscriptionId: userSub.id })

    return { success: true }
  }),

  /** Create a setup checkout to update payment method, returns the checkout URL */
  airwallexCreateSetupCheckout: protectedProcedure
    .input(z.object({ returnUrl: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const userSub = await db.userSubscription.findFirst({
        where: {
          userId,
          deletedAt: null,
          gateway: 'AIRWALLEX',
          gatewaySubscriptionId: { not: '' },
          status: { in: ['ACTIVE', 'PAST_DUE', 'UNPAID', 'TRIALING'] },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!userSub) {
        throw new Error('No active Airwallex subscription found')
      }

      // Get billing_customer_id + currency from gateway subscription
      const gatewaySub = await getAirwallexSubscriptionForPortal(userSub.gatewaySubscriptionId)
      const billingCustomerId = gatewaySub?.billingCustomerId
      const currency = gatewaySub?.currency
      if (!billingCustomerId || !currency) throw new Error('Missing billing customer/currency from Airwallex subscription')

      const origin = (() => {
        try {
          return new URL(input.returnUrl).origin
        } catch {
          return null
        }
      })()
      if (!origin) throw new Error('Invalid returnUrl')

      const portalUrl = `${origin}/account/manage-subscription/airwallex`

      const checkout = await createAirwallexBillingCheckoutSetup({
        billingCustomerId,
        currency,
        successUrl: input.returnUrl,
        backUrl: portalUrl,
        locale: 'EN',
        metadata: { userId, gatewaySubscriptionId: userSub.gatewaySubscriptionId },
        requestId: `portal_setup_${userId}_${Date.now()}`,
      })

      if (!checkout) {
        throw new Error('Failed to create setup checkout')
      }

      return { checkoutUrl: checkout.url, checkoutId: checkout.id, gatewaySubscriptionId: userSub.gatewaySubscriptionId }
    }),
})


