'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Check, Copy } from 'lucide-react'

export function PaymentFailedClient() {
  const searchParams = useSearchParams()
  const paymentId = searchParams?.get('paymentId') ?? ''
  const orderId = searchParams?.get('orderId') ?? ''
  const reason = searchParams?.get('reason') ?? ''

  const hasQueryParams = (paymentId && paymentId.length > 0) || (orderId && orderId.length > 0)

  const { data: payment } = api.order.getPayment.useQuery(
    { paymentId },
    { enabled: !!paymentId }
  )

  const title = useMemo(() => {
    if (!hasQueryParams) return 'Payment status unavailable'
    if (reason === 'canceled') return 'Payment canceled'
    if (reason === 'failed') return 'Payment failed'
    return 'Payment unsuccessful'
  }, [hasQueryParams, reason])

  const description = useMemo(() => {
    if (!hasQueryParams) return 'Missing payment parameters. You can return to the homepage or pricing to continue.'
    if (reason === 'canceled') return 'You canceled the payment on the checkout page.'
    if (reason === 'failed') return 'Your payment was not completed. You can retry from the pricing page.'
    return 'Payment was not successful. You can retry from the pricing page.'
  }, [hasQueryParams, reason])

  const [copiedKey, setCopiedKey] = useState<'payment' | 'order' | null>(null)
  const handleCopy = async (text: string, key: 'payment' | 'order') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1200)
    } catch {
      // noop
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        <div className="mt-8 rounded-lg border p-6 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm text-muted-foreground">Payment ID</span>
              <div className="truncate font-mono text-sm">{paymentId || '-'}</div>
            </div>
            {paymentId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(paymentId, 'payment')}
                className="shrink-0"
              >
                {copiedKey === 'payment' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm text-muted-foreground">Order ID</span>
              <div className="truncate font-mono text-sm">{orderId || '-'}</div>
            </div>
            {orderId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(orderId, 'order')}
                className="shrink-0"
              >
                {copiedKey === 'order' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="text-sm font-medium">{hasQueryParams ? (payment?.status ?? '-') : '-'}</span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          {!hasQueryParams ? (
            <>
              <Link href="/"><Button>Go to Home</Button></Link>
              <Link href="/account/billing"><Button variant="secondary">Back to Billing</Button></Link>
            </>
          ) : (
            <>
              <Link href="/account/billing"><Button>Back to Billing</Button></Link>
              <Link href="/chat"><Button variant="secondary">Go to Chat</Button></Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}


