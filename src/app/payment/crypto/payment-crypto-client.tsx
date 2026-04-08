'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Check, Copy, Loader2, ArrowLeft, ShieldCheck, AlertTriangle, RefreshCw, Clock, Hash } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'react-qr-code'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { CRYPTO_CURRENCIES } from '@/components/billing/crypto-currency-select'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { track } from '@/analytics'
import { BILLING_EVENTS } from '@/analytics/events/billing'

type NowPaymentsExtra = {
  payment_id?: string
  payment_status?: string
  pay_address?: string
  pay_amount?: number
  pay_currency?: string
  price_amount?: number
  price_currency?: string
  actually_paid?: number
  payin_hash?: string
  payout_hash?: string
  updated_at?: string
}

function ceilToDecimals(value: number, decimals: number) {
  if (!Number.isFinite(value)) return value
  const d = Math.max(0, Math.floor(decimals))
  const factor = 10 ** d
  // +EPSILON to reduce float edge cases where value*factor is like 110.00000000002
  return Math.ceil((value + Number.EPSILON) * factor) / factor
}

// Helper to look up network name
function getNetworkName(currencySymbol: string) {
  const match = CRYPTO_CURRENCIES.find(c => c.id.toLowerCase() === currencySymbol.toLowerCase())
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

// Circular Countdown Timer
function StatusRing({ createdAt, stop }: { createdAt: Date; stop?: boolean }) {
  const EXPIRE_MINUTES = 120 
  const [progress, setProgress] = useState(100)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (stop) {
      setProgress(100)
      setTimeLeft('Detected')
      return
    }

    const start = createdAt.getTime()
    const end = start + EXPIRE_MINUTES * 60 * 1000
    const totalDuration = end - start
    
    const tick = () => {
      const now = Date.now()
      const remaining = Math.max(0, end - now)
      const p = (remaining / totalDuration) * 100
      
      setProgress(p)
      
      if (remaining <= 0) {
        setTimeLeft('Expired')
        return
      }
      
      const m = Math.floor(remaining / 60000)
      const s = Math.floor((remaining % 60000) / 1000)
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`)
    }
    
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [createdAt, stop])

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse Effect - only animate if not stopped */}
      {!stop && <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-75" />}
      
      <div className={cn(
        "relative z-10 flex items-center gap-2 backdrop-blur-sm border rounded-full px-4 py-1.5 shadow-sm transition-colors duration-500",
        stop ? "bg-green-500/10 border-green-500/30 text-green-600" : "bg-background/80 border-blue-500/30"
      )}>
        <div className="relative w-4 h-4 flex items-center justify-center">
           <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
             <path className="text-muted/30" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
             <path 
               className={cn("transition-all duration-1000 ease-linear", stop ? "text-green-500" : "text-blue-500")}
               strokeDasharray={`${progress}, 100`} 
               d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
               fill="none" 
               stroke="currentColor" 
               strokeWidth="4" 
             />
           </svg>
        </div>
        <span className="text-xs font-mono font-medium text-foreground tabular-nums">
          {timeLeft}
        </span>
      </div>
    </div>
  )
}

export function PaymentCryptoClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentId = searchParams?.get('paymentId') ?? ''
  const orderId = searchParams?.get('orderId') ?? ''
  const exitTo = searchParams?.get('from') ?? '/'
  
  const { data: payment, isLoading, refetch } = api.order.getPayment.useQuery(
    { paymentId },
    { enabled: !!paymentId, refetchInterval: 30_000 }
  )

  const extra = payment?.extra as unknown as { nowpayments?: NowPaymentsExtra } | null
  const np = extra?.nowpayments

  const npStatus = useMemo(() => {
    return (np?.payment_status ?? 'waiting').toLowerCase()
  }, [np])

  const isPartiallyPaid = npStatus === 'partially_paid'
  // Treat partially_paid as waiting for user action (sending more funds)
  const isWaiting = npStatus === 'waiting' || isPartiallyPaid
  const isInProgress = ['confirming', 'confirmed', 'sending'].includes(npStatus)

  const hasTrackedViewRef = useRef(false)
  useEffect(() => {
    if (!paymentId) return
    if (hasTrackedViewRef.current) return
    hasTrackedViewRef.current = true
    track(BILLING_EVENTS.CRYPTO_PAYMENT_VIEW, {
      payment_id: paymentId,
      order_id: orderId || undefined,
      from: exitTo,
    })
  }, [paymentId, orderId, exitTo])

  const lastStatusRef = useRef<{ paymentStatus?: string; npStatus?: string } | null>(null)
  useEffect(() => {
    if (!paymentId) return
    if (!payment) return
    const next = { paymentStatus: payment.status, npStatus }
    const prev = lastStatusRef.current
    if (prev?.paymentStatus === next.paymentStatus && prev?.npStatus === next.npStatus) return
    lastStatusRef.current = next
    track(BILLING_EVENTS.CRYPTO_PAYMENT_STATUS, {
      payment_id: paymentId,
      order_id: orderId || undefined,
      payment_status: payment.status,
      np_status: npStatus,
    })
  }, [payment, paymentId, orderId, npStatus])

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
    // Round up to 6 decimals
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

  const progressSteps = useMemo(() => {
    const steps = [
      { key: 'waiting', title: 'Waiting for payment', desc: 'Send the exact amount from your wallet.' },
      { key: 'confirming', title: 'Confirming', desc: 'Transaction detected, waiting for block confirmations.' },
      { key: 'confirmed', title: 'Confirmed', desc: 'Transaction confirmed by the network.' },
      { key: 'sending', title: 'Finalizing', desc: 'Final settlement in progress.' },
      { key: 'finished', title: 'Completed', desc: 'Payment completed.' },
    ] as const

    const order = ['waiting', 'partially_paid', 'confirming', 'confirmed', 'sending', 'finished'] as const
    let currentKey = npStatus as typeof order[number]
    if (!order.includes(currentKey)) currentKey = 'waiting'
    
    // If partially paid, we are technically still at step 0 (waiting), but with a warning.
    // For the stepper, we can treat it as 'waiting' or map it.
    
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

    track(BILLING_EVENTS.CRYPTO_PAYMENT_ACTION, {
      payment_id: paymentId,
      order_id: orderId || undefined,
      action: "manual_check_start",
    })
    
    // Simulate "phases" of checking to build trust
    const startTime = Date.now()
    const DURATION = 45000 // Check for 45s
    
    try {
      while (Date.now() - startTime < DURATION) {
        // Update phase text visually
        const elapsed = Date.now() - startTime
        if (elapsed > 25000) setCheckingPhase(3)
        else if (elapsed > 10000) setCheckingPhase(2)
        else if (elapsed > 2000) setCheckingPhase(1)

        const { data: latest } = await refetch()
        const extra = latest?.extra as unknown as { nowpayments?: NowPaymentsExtra }
        const status = extra?.nowpayments?.payment_status?.toLowerCase() ?? 'waiting'
        
        // If we found it (anything other than waiting or if it was partially paid and now fixed)
        // Note: strictly speaking, partially_paid is "found" but we want "progress"
        const isProgressing = ['confirming', 'confirmed', 'sending', 'finished'].includes(status)
        
        if (isProgressing) {
          track(BILLING_EVENTS.CRYPTO_PAYMENT_ACTION, {
            payment_id: paymentId,
            order_id: orderId || undefined,
            action: "manual_check_detected",
            value: status,
          })
          toast.success("Payment Detected!", {
            description: "Your transaction has been found on the blockchain."
          })
          setIsManualChecking(false)
          return
        }

        // Wait 3s
        await new Promise(r => setTimeout(r, 3000))
      }

      // If we exit loop without success
      track(BILLING_EVENTS.CRYPTO_PAYMENT_ACTION, {
        payment_id: paymentId,
        order_id: orderId || undefined,
        action: "manual_check_timeout",
      })
      toast.info("Still waiting for network confirmation", {
         description: "Blockchain transactions can take 1-10 minutes depending on network congestion. We will keep checking automatically.",
         duration: 5000
      })

    } catch (e) {
      console.error(e)
      track(BILLING_EVENTS.CRYPTO_PAYMENT_ACTION, {
        payment_id: paymentId,
        order_id: orderId || undefined,
        action: "manual_check_error",
        value: e instanceof Error ? e.message : String(e),
      })
      toast.error("Connection error", { description: "Could not reach payment server." })
    } finally {
      setIsManualChecking(false)
      setCheckingPhase(0)
    }
  }

  const getCheckingText = () => {
    switch (checkingPhase) {
      case 0: return "Connecting to blockchain node..."
      case 1: return "Scanning recent blocks..."
      case 2: return "Verifying transaction hash..."
      case 3: return "Still syncing, please wait..."
      default: return "Checking status..."
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

      const action =
        key === 'amount'
          ? 'copy_amount'
          : key === 'address'
            ? 'copy_address'
            : key === 'hash'
              ? 'copy_hash'
              : null
      if (action) {
        track(BILLING_EVENTS.CRYPTO_PAYMENT_ACTION, {
          payment_id: paymentId,
          order_id: orderId || undefined,
          action,
          value: text,
        })
      }
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
        <Button className="mt-4" onClick={() => router.push('/account/billing')}>Back to Billing</Button>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col font-sans">
      
      {/* 1. Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40 px-4 h-14 flex items-center justify-between shrink-0">
        <Button variant="ghost" size="icon" className="-ml-2 h-10 w-10 rounded-full text-foreground/80 hover:text-foreground" asChild>
          <Link href={backUrl} replace>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-base font-semibold text-foreground">Payment</span>
        <div className="w-8" />
      </header>

      <main className="flex-1 flex flex-col items-center pt-6 px-6 pb-32 sm:pb-12 sm:max-w-md sm:mx-auto sm:w-full overflow-y-auto">
        
        {/* Status Ring */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          {/* Stop counting down if we have detected funds (partial or confirming) to reduce anxiety */}
          <StatusRing createdAt={payment.createdAt} stop={isPartiallyPaid || isInProgress} />
        </motion.div>

        {isWaiting ? (
          <>
            {/* Partial Payment Warning */}
            {isPartiallyPaid && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-6 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400 font-bold mb-1">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Insufficient Amount</span>
                </div>
                <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 leading-relaxed">
                  We received <span className="font-mono font-medium">{np?.actually_paid}</span> {payCurrencyText}.
                  <br />
                  Please send the remaining amount below.
                </p>
              </motion.div>
            )}

            {/* Big Amount */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center mb-6 sm:mb-8 w-full"
            >
              <button 
                onClick={() => handleCopy(isPartiallyPaid ? remainingAmountText! : payAmountText, 'amount')}
                className="group relative inline-flex flex-col items-center"
              >
                <div className="flex items-baseline gap-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                  {isPartiallyPaid ? remainingAmountText : payAmountText}
                  <span className="text-lg sm:text-2xl font-bold text-muted-foreground">{payCurrencyText}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-primary/80 group-hover:text-primary transition-colors bg-primary/5 px-2 py-0.5 rounded-full">
                  {copiedKey === 'amount' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>Tap to copy {isPartiallyPaid ? 'remaining amount' : 'amount'}</span>
                </div>
              </button>
            </motion.div>

            {/* Exchange Rate / Validity Hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex flex-wrap items-center justify-center gap-2 mb-6 text-[11px] font-medium"
            >
              <div className="flex items-center gap-1.5 bg-blue-500/5 border border-blue-500/10 px-2.5 py-1 rounded-full text-blue-600 dark:text-blue-400">
                <RefreshCw className="w-3 h-3" />
                <span>Rate valid for ~2h</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-full text-amber-600 dark:text-amber-400">
                 <AlertTriangle className="w-3 h-3" />
                 <span>Send exact amount</span>
              </div>
            </motion.div>

            {/* Address Pill */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full space-y-3 mb-6"
            >
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isPartiallyPaid ? 'Send Remaining To' : 'Wallet Address'}
                  </label>
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded">
                    <AlertTriangle className="w-3 h-3" />
                    {networkName}
                  </span>
                </div>
                
                <button
                  onClick={() => handleCopy(payAddressText, 'address')}
                  className="w-full p-3.5 bg-muted/30 hover:bg-muted/50 border border-border rounded-xl flex items-center justify-between gap-3 transition-colors group active:scale-[0.99]"
                >
                  <div className="font-mono text-sm break-all text-left text-foreground/90 leading-relaxed">
                    {payAddressText}
                  </div>
                  <div className="shrink-0 p-2 bg-background rounded-lg border shadow-sm group-hover:border-primary/30 transition-colors">
                    {copiedKey === 'address' ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    )}
                  </div>
                </button>
              </div>
            </motion.div>

            {/* QR Code Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="w-full flex flex-col items-center"
            >
               <button 
                 onClick={() => {
                   const next = !showQR
                   setShowQR(next)
                   track(BILLING_EVENTS.CRYPTO_PAYMENT_ACTION, {
                     payment_id: paymentId,
                     order_id: orderId || undefined,
                     action: "toggle_qr",
                     show: next,
                   })
                 }}
                 className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
               >
                 <span>{showQR ? 'Hide QR Code' : 'Show QR Code'}</span>
                 {showQR ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
               </button>

               <AnimatePresence>
                 {showQR && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="overflow-hidden"
                   >
                     <div className="p-4 sm:p-5 bg-white rounded-[24px] shadow-sm border border-border/60 mt-2 mb-4 relative group">
                       <QRCode 
                         value={payAddressText} 
                         size={160}
                         level="M"
                         className="w-full h-auto max-w-[160px] sm:max-w-[200px]"
                       />
                       <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                         Scan to Pay
                       </div>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </motion.div>

            {/* Manual Check Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-full mt-2"
            >
              <Button 
                variant="outline" 
                className={cn(
                  "w-full h-12 rounded-xl transition-all gap-2 border-border/60",
                  isManualChecking 
                    ? "bg-primary/5 border-primary/20 text-primary" 
                    : "hover:bg-primary/5 hover:border-primary/50 hover:text-foreground text-muted-foreground border-dashed"
                )}
                onClick={handleManualCheck}
                disabled={isManualChecking}
              >
                {isManualChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="animate-pulse">{getCheckingText()}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>I have sent the payment</span>
                  </>
                )}
              </Button>
            </motion.div>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mt-2 space-y-6"
          >
            {/* Status Card */}
            <div className="w-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-green-500/10 rounded-full">
                     <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                   </div>
                   <span className="text-sm font-semibold text-foreground">Payment Receipt</span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded border border-border/30">
                  ID: {paymentId.slice(-8).toUpperCase()}
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                    npStatus === 'finished' 
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  )}>
                    {npStatus.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Amount Paid</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono font-medium text-foreground">
                      {np?.actually_paid ?? np?.pay_amount ?? '-'} 
                    </span>
                    <span className="text-xs text-muted-foreground">{payCurrencyText}</span>
                  </div>
                </div>

                {np?.payin_hash && (
                   <div className="flex flex-col gap-1.5 pt-2 border-t border-border/30">
                     <span className="text-xs text-muted-foreground flex items-center gap-1">
                       <Hash className="w-3 h-3" /> Transaction Hash
                     </span>
                     <button 
                       onClick={() => handleCopy(np.payin_hash!, 'hash')}
                       className="flex items-center justify-between p-2 bg-muted/30 hover:bg-muted/50 rounded-lg border border-border/30 transition-colors group text-left"
                     >
                        <span className="text-xs font-mono text-foreground/80 truncate pr-2 w-[200px] sm:w-[280px]">
                          {np.payin_hash}
                        </span>
                        {copiedKey === 'hash' ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                     </button>
                   </div>
                )}
                
                <div className="flex items-center gap-2 pt-2">
                   <Clock className="w-3 h-3 text-muted-foreground" />
                   <span className="text-[10px] text-muted-foreground">
                     Last updated: {new Date().toLocaleTimeString()}
                   </span>
                </div>
              </div>
            </div>

            {/* Vertical progress */}
            <div className="w-full bg-muted/20 border border-border/50 rounded-2xl p-4">
              <div className="flex flex-col gap-4">
                {progressSteps.map((s) => (
                  <div key={s.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center pt-0.5">
                      <div
                        className={cn(
                          "h-3 w-3 rounded-full transition-all duration-500",
                          s.state === "done"
                            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                            : s.state === "active"
                              ? "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                              : "bg-muted-foreground/20 border border-muted-foreground/30"
                        )}
                      />
                      <div
                        className={cn(
                          "w-px flex-1 mt-1 transition-colors duration-500",
                          s.key === "finished" ? "hidden" : "block",
                          s.state === "done" ? "bg-green-500/40" : "bg-border"
                        )}
                        style={{ minHeight: 18 }}
                      />
                    </div>
                    <div className="flex-1 -mt-0.5">
                      <div className={cn(
                        "text-sm font-medium transition-colors duration-300", 
                        s.state === "todo" ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {s.title}
                      </div>
                      <div className="text-xs text-muted-foreground/80 mt-0.5 leading-snug">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

      </main>

      {/* Footer */}
      <footer className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-xl border-t border-border/40 pb-safe pt-3 px-6 shrink-0">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-md mx-auto w-full flex flex-col items-center gap-3 pb-2"
        >
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
             <ShieldCheck className="w-3 h-3" />
             <span>
               {isWaiting
                 ? isPartiallyPaid 
                   ? "Funds detected but insufficient. Please top up."
                   : "Send the exact amount to start processing."
                 : isInProgress
                   ? "Processing on blockchain. Safe to close if needed."
                   : "Waiting for update..."}
             </span>
          </div>
          
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground/60">
            <span>Need help?</span>
            <span className="font-medium text-muted-foreground">support@example.com</span>
          </div>
        </motion.div>
      </footer>

    </div>
  )
}
