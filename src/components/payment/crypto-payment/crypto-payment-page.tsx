'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { CRYPTO_CURRENCIES } from '@/components/billing/crypto-currency-select'

import { CryptoPaymentHeader } from './crypto-payment-header'
import { CryptoPaymentStatusRing } from './crypto-payment-status-ring'
import { CryptoPaymentAmount } from './crypto-payment-amount'
import { CryptoPaymentHints } from './crypto-payment-hints'
import { CryptoPaymentAddress } from './crypto-payment-address'
import { CryptoPaymentQRCode } from './crypto-payment-qr-code'
import { CryptoPaymentCheckButton } from './crypto-payment-check-button'
import { CryptoPaymentPartialWarning } from './crypto-payment-partial-warning'
import { CryptoPaymentReceipt } from './crypto-payment-receipt'
import { CryptoPaymentProgress } from './crypto-payment-progress'
import { CryptoPaymentFooter } from './crypto-payment-footer'
import { ceilToDecimals, type NowPaymentsExtra, type ProgressStep } from './types'

function getNetworkName(currencySymbol: string) {
  const match = CRYPTO_CURRENCIES.find((c) => c.id.toLowerCase() === currencySymbol.toLowerCase())
  if (match) return match.network

  const lower = currencySymbol.toLowerCase()
  if (lower.includes('trc20')) return 'TRC20 (TRON)'
  if (lower.includes('erc20')) return 'Ethereum (ERC20)'
  if (lower.includes('bsc')) return 'BSC (BEP20)'
  if (lower.includes('sol')) return 'Solana'
  if (lower.includes('arb')) return 'Arbitrum'
  if (lower === 'btc') return 'Bitcoin'
  if (lower === 'eth') return 'Ethereum'
  return currencySymbol.toUpperCase()
}

export function CryptoPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentId = searchParams?.get('paymentId') ?? ''
  const orderId = searchParams?.get('orderId') ?? ''
  const exitTo = searchParams?.get('from') ?? '/'

  const {
    data: payment,
    isLoading,
    refetch,
  } = api.order.getPayment.useQuery(
    { paymentId },
    { enabled: !!paymentId, refetchInterval: 30_000 }
  )

  const createInvoiceMutation = api.order.createCryptoInvoice.useMutation()
  const hasRequestedInvoiceRef = useRef(false)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)

  const extra = payment?.extra as unknown as { nowpayments?: NowPaymentsExtra } | null
  const np = extra?.nowpayments

  const hasInvoice = useMemo(() => {
    if (!np) return false
    const hasId = typeof np.payment_id === 'string' && np.payment_id.length > 0
    const hasAddr = typeof np.pay_address === 'string' && np.pay_address.length > 0
    const hasAmt =
      typeof np.pay_amount === 'number' ||
      typeof np.price_amount === 'number'
    return (hasId || hasAddr) && hasAmt
  }, [np])

  // Lazily create NowPayments invoice on the crypto payment page (Scheme A)
  useEffect(() => {
    if (!paymentId) return
    if (!payment) return
    if ((payment.paymentGateway ?? '').toUpperCase() !== 'NOWPAYMENTS') return
    if (payment.status !== 'PENDING') return
    if (hasInvoice) return
    if (createInvoiceMutation.isPending) return
    if (hasRequestedInvoiceRef.current) return
    if (retryCountdown !== null) return
    hasRequestedInvoiceRef.current = true

    createInvoiceMutation.mutate(
      { paymentId },
      {
        onSuccess: (data) => {
          if (data.status === 'RATE_LIMITED') {
            // NowPayments is busy — auto-retry after countdown
            hasRequestedInvoiceRef.current = false
            setRetryCountdown(data.retryAfterSeconds)
            return
          }

          if (data.status === 'ALREADY_TERMINAL') {
            // Payment already finished (e.g. webhook fired) — refetch to trigger redirect
            void refetch()
            return
          }

          if (data.status === 'AMOUNT_TOO_LOW') {
            hasRequestedInvoiceRef.current = false
            toast.message('Crypto amount too low', { description: data.message })
            const productId = payment?.order?.productId
            const back =
              productId
                ? `/payment/select-crypto?productId=${encodeURIComponent(productId)}&from=${encodeURIComponent(exitTo)}`
                : exitTo
            router.replace(back)
            return
          }

          // SUCCESS — refetch payment to pick up the new invoice data
          void refetch()
        },
        onError: (e) => {
          // Real error (not rate limit) — allow manual retry
          hasRequestedInvoiceRef.current = false
          const msg =
            (e as { message?: string } | null)?.message ??
            'Failed to create crypto invoice. Please retry.'
          toast.error('Crypto invoice error', { description: msg })
        },
      }
    )
  }, [paymentId, payment, hasInvoice, createInvoiceMutation, retryCountdown, refetch, router, exitTo])

  // Countdown timer — when it reaches 0, clear it so the above effect retries automatically
  useEffect(() => {
    if (retryCountdown === null) return
    if (retryCountdown <= 0) {
      setRetryCountdown(null)
      return
    }
    const timer = setTimeout(() => setRetryCountdown((p) => (p ?? 1) - 1), 1000)
    return () => clearTimeout(timer)
  }, [retryCountdown])

  const npStatus = useMemo(() => {
    return (np?.payment_status ?? 'waiting').toLowerCase()
  }, [np])

  const isPartiallyPaid = npStatus === 'partially_paid'
  const isWaiting = npStatus === 'waiting' || isPartiallyPaid
  const isInProgress = ['confirming', 'confirmed', 'sending'].includes(npStatus)

  const payAmountText = useMemo(() => {
    const raw =
      typeof np?.pay_amount === 'number'
        ? np.pay_amount
        : typeof np?.price_amount === 'number'
          ? np.price_amount
          : undefined
    if (typeof raw !== 'number') return '-'
    const rounded = ceilToDecimals(raw, 6)
    return rounded.toFixed(6)
  }, [np])

  const remainingAmountText = useMemo(() => {
    if (!isPartiallyPaid) return null
    const pay = typeof np?.pay_amount === 'number' ? np.pay_amount : 0
    const actual = typeof np?.actually_paid === 'number' ? np.actually_paid : 0
    const rem = ceilToDecimals(Math.max(0, pay - actual), 6)
    return rem.toFixed(6)
  }, [np, isPartiallyPaid])

  const payCurrencyText = useMemo(() => {
    return (np?.pay_currency ?? 'USDT').toUpperCase()
  }, [np])

  const networkName = useMemo(() => {
    return getNetworkName(np?.pay_currency ?? 'usdttrc20')
  }, [np])

  const payAddressText = useMemo(() => {
    return np?.pay_address ?? '-'
  }, [np])

  const progressSteps = useMemo<ProgressStep[]>(() => {
    const steps = [
      { key: 'waiting', title: 'Waiting for payment', desc: 'Send the exact amount from your wallet.' },
      { key: 'confirming', title: 'Confirming', desc: 'Transaction detected, waiting for block confirmations.' },
      { key: 'confirmed', title: 'Confirmed', desc: 'Transaction confirmed by the network.' },
      { key: 'sending', title: 'Finalizing', desc: 'Final settlement in progress.' },
      { key: 'finished', title: 'Completed', desc: 'Payment completed.' },
    ] as const

    const order = ['waiting', 'partially_paid', 'confirming', 'confirmed', 'sending', 'finished'] as const
    let currentKey = npStatus as (typeof order)[number]
    if (!order.includes(currentKey)) currentKey = 'waiting'

    let activeIndex = 0
    if (currentKey === 'partially_paid') activeIndex = 0
    else if (currentKey === 'confirming') activeIndex = 1
    else if (currentKey === 'confirmed') activeIndex = 2
    else if (currentKey === 'sending') activeIndex = 3
    else if (currentKey === 'finished') activeIndex = 4

    return steps.map((s, i) => ({
      ...s,
      state: i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'todo',
    }))
  }, [npStatus])

  // Redirect on terminal status
  useEffect(() => {
    if (!paymentId) return
    if (!payment?.status) return

    if (payment.status === 'SUCCEEDED') {
      const u = new URL(`${window.location.origin}/payment/success`)
      u.searchParams.set('paymentId', paymentId)
      if (orderId) u.searchParams.set('orderId', orderId)
      router.replace(u.toString())
      return
    }

    if (['FAILED', 'EXPIRED', 'REFUNDED'].includes(payment.status)) {
      const u = new URL(`${window.location.origin}/payment/failed`)
      u.searchParams.set('paymentId', paymentId)
      if (orderId) u.searchParams.set('orderId', orderId)
      u.searchParams.set('reason', payment.status === 'EXPIRED' ? 'canceled' : 'failed')
      router.replace(u.toString())
    }
  }, [payment?.status, paymentId, orderId, router])

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [isManualChecking, setIsManualChecking] = useState(false)
  const [checkingPhase, setCheckingPhase] = useState(0)

  const handleManualCheck = async () => {
    if (isManualChecking) return
    setIsManualChecking(true)
    setCheckingPhase(0)

    const startTime = Date.now()
    const DURATION = 45000

    try {
      while (Date.now() - startTime < DURATION) {
        const elapsed = Date.now() - startTime
        if (elapsed > 25000) setCheckingPhase(3)
        else if (elapsed > 10000) setCheckingPhase(2)
        else if (elapsed > 2000) setCheckingPhase(1)

        const { data: latest } = await refetch()
        const extra = latest?.extra as unknown as { nowpayments?: NowPaymentsExtra }
        const status = extra?.nowpayments?.payment_status?.toLowerCase() ?? 'waiting'

        const isProgressing = ['confirming', 'confirmed', 'sending', 'finished'].includes(status)

        if (isProgressing) {
          toast.success('Payment Detected!', {
            description: 'Your transaction has been found on the blockchain.',
          })
          setIsManualChecking(false)
          return
        }

        await new Promise((r) => setTimeout(r, 3000))
      }

      toast.info('Still waiting for network confirmation', {
        description:
          'Blockchain transactions can take 1-10 minutes depending on network congestion. We will keep checking automatically.',
        duration: 5000,
      })
    } catch (e) {
      console.error(e)
      toast.error('Connection error', { description: 'Could not reach payment server.' })
    } finally {
      setIsManualChecking(false)
      setCheckingPhase(0)
    }
  }

  // Auto-expand QR on desktop
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      setShowQR(true)
    }
  }, [])

  const handleCopy = async (text: string, key: string) => {
    if (!text || text === '-') return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1200)
    } catch {
      // noop
    }
  }

  const backUrl = payment?.order?.productId
    ? `/payment/select-crypto?productId=${payment.order.productId}&from=${encodeURIComponent(exitTo)}`
    : exitTo

  if (isLoading && !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h1 className="text-xl font-semibold">Payment not found</h1>
        <Button className="mt-4" onClick={() => router.push('/account/billing')}>
          Back to Billing
        </Button>
      </div>
    )
  }

  // If invoice is not ready yet, show a dedicated state (prevents showing "-" address/amount)
  if ((payment.paymentGateway ?? '').toUpperCase() === 'NOWPAYMENTS' && payment.status === 'PENDING' && !hasInvoice) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col font-sans">
        <CryptoPaymentHeader backUrl={backUrl} />
        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16 sm:max-w-md sm:mx-auto sm:w-full">
          <div className="w-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 text-center shadow-sm">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              {retryCountdown != null && retryCountdown > 0
                ? `High traffic — retrying in ${retryCountdown}s…`
                : 'Preparing your crypto payment request…'}
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {retryCountdown != null && retryCountdown > 0
                ? 'The payment gateway is temporarily busy. Your request will be retried automatically.'
                : "We're generating a unique address and exact amount. This may take a few seconds."}
            </p>
            <div className="mt-5 flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  hasRequestedInvoiceRef.current = false
                  void refetch()
                }}
              >
                Refresh
              </Button>
              <Button
                onClick={() => {
                  setRetryCountdown(null)
                  hasRequestedInvoiceRef.current = false
                  createInvoiceMutation.mutate(
                    { paymentId },
                    {
                      onSuccess: (data) => {
                        if (data.status === 'RATE_LIMITED') {
                          hasRequestedInvoiceRef.current = false
                          setRetryCountdown(data.retryAfterSeconds)
                          return
                        }
                        if (data.status === 'AMOUNT_TOO_LOW') {
                          hasRequestedInvoiceRef.current = false
                          toast.message('Crypto amount too low', { description: data.message })
                          const productId = payment?.order?.productId
                          const back =
                            productId
                              ? `/payment/select-crypto?productId=${encodeURIComponent(productId)}&from=${encodeURIComponent(exitTo)}`
                              : exitTo
                          router.replace(back)
                          return
                        }
                        void refetch()
                      },
                      onError: (e) => {
                        hasRequestedInvoiceRef.current = false
                        const msg =
                          (e as { message?: string } | null)?.message ??
                          'Failed to create crypto invoice. Please retry.'
                        toast.error('Crypto invoice error', { description: msg })
                      },
                    }
                  )
                }}
                disabled={createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? 'Creating…' : 'Retry Now'}
              </Button>
            </div>
          </div>
        </main>
        <CryptoPaymentFooter isWaiting={true} isPartiallyPaid={false} isInProgress={false} />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col font-sans">
      <CryptoPaymentHeader backUrl={backUrl} />

      <main className="flex-1 flex flex-col items-center pt-6 px-6 pb-32 sm:pb-12 sm:max-w-md sm:mx-auto sm:w-full overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <CryptoPaymentStatusRing
            createdAt={payment.createdAt}
            stop={isPartiallyPaid || isInProgress}
          />
        </motion.div>

        {isWaiting ? (
          <>
            {isPartiallyPaid && (
              <CryptoPaymentPartialWarning
                actuallyPaid={np?.actually_paid}
                currency={payCurrencyText}
              />
            )}

            <CryptoPaymentAmount
              amount={isPartiallyPaid ? remainingAmountText! : payAmountText}
              currency={payCurrencyText}
              isPartiallyPaid={isPartiallyPaid}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />

            <CryptoPaymentHints />

            <CryptoPaymentAddress
              address={payAddressText}
              networkName={networkName}
              isPartiallyPaid={isPartiallyPaid}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />

            <CryptoPaymentQRCode
              address={payAddressText}
              showQR={showQR}
              onToggle={() => setShowQR(!showQR)}
            />

            <CryptoPaymentCheckButton
              isManualChecking={isManualChecking}
              checkingPhase={checkingPhase}
              onCheck={handleManualCheck}
            />
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mt-2 space-y-6"
          >
            <CryptoPaymentReceipt
              paymentId={paymentId}
              npStatus={npStatus}
              actuallyPaid={np?.actually_paid}
              payAmount={np?.pay_amount}
              currency={payCurrencyText}
              payinHash={np?.payin_hash}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />

            <CryptoPaymentProgress steps={progressSteps} />
          </motion.div>
        )}
      </main>

      <CryptoPaymentFooter
        isWaiting={isWaiting}
        isPartiallyPaid={isPartiallyPaid}
        isInProgress={isInProgress}
      />
    </div>
  )
}

