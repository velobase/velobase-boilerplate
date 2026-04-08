'use client'

import { useSearchParams } from 'next/navigation'
import { api } from '@/trpc/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { toast } from 'sonner'
import { track } from '@/analytics'
import { BILLING_EVENTS } from '@/analytics/events/billing'

import { CryptoCheckoutHeader } from './crypto-checkout-header'
import { CryptoOrderSummary } from './crypto-order-summary'
import { CryptoQuantitySelector } from './crypto-quantity-selector'
import { CryptoNetworkSelector } from './crypto-network-selector'
import { CryptoCurrencyPicker } from './crypto-currency-picker'
import { CryptoCheckoutFooter } from './crypto-checkout-footer'
import { 
  FALLBACK_TOP_CURRENCIES, 
  TOP_CURRENCY_IDS,
  type CryptoCurrency, 
  type CryptoCheckoutPreview, 
  type CryptoEstimate 
} from './types'

export function CryptoCheckoutPage() {
  const searchParams = useSearchParams()
  const productId = searchParams?.get('productId') ?? ''
  const exitTo = searchParams?.get('from') ?? '/'
  
  // 默认选中 usdtbsc，不等 currencies 返回
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>('usdtbsc')
  const [quantity, setQuantity] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: currencies, isLoading: isLoadingCurrencies } = api.order.getCryptoCurrencies.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 } // 5 分钟缓存
  )

  // 合并后端数据与本地兜底
  const CRYPTO_CURRENCIES = useMemo(() => {
    const remote = (currencies ?? []) as unknown as CryptoCurrency[]
    if (remote.length > 0) return remote
    return FALLBACK_TOP_CURRENCIES
  }, [currencies])

  // Top 3 列表：优先用后端数据（有 logo），否则用兜底
  const topList = useMemo(() => {
    const remote = (currencies ?? []) as unknown as CryptoCurrency[]
    if (remote.length > 0) {
      return remote.filter((c) => TOP_CURRENCY_IDS.includes(c.id as (typeof TOP_CURRENCY_IDS)[number]))
    }
    return FALLBACK_TOP_CURRENCIES
  }, [currencies])

  const filteredCurrencies = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/\s+/g, '')
    if (!q) return CRYPTO_CURRENCIES
    
    return CRYPTO_CURRENCIES.filter((c) => {
      const basic = `${c.id} ${c.symbol} ${c.network} ${c.name} ${c.label}`.toLowerCase()
      
      let aliases = ''
      const isERC20 = c.network.toLowerCase().includes('erc20') || c.network.toLowerCase().includes('ethereum')
      const isTRC20 = c.network.toLowerCase().includes('trc20') || c.network.toLowerCase().includes('tron')
      const isBSC = c.network.toLowerCase().includes('bsc') || c.network.toLowerCase().includes('binance')
      const isPolygon = c.network.toLowerCase().includes('polygon') || c.network.toLowerCase().includes('matic')
      const isArb = c.network.toLowerCase().includes('arbitrum')
      
      if (c.symbol === 'USDC') {
        if (isERC20) aliases += 'usdce usdcearth usdceth '
        if (isTRC20) aliases += 'usdct usdctron '
        if (isBSC) aliases += 'usdcb usdcbinance '
        if (isPolygon) aliases += 'usdcpoly usdcpolygon usdcmatic '
        if (isArb) aliases += 'usdcarb usdcarbitrum '
      }
      
      if (c.symbol === 'USDT') {
        if (isERC20) aliases += 'usdte usdteth usdterc '
        if (isTRC20) aliases += 'usdtt usdttron '
        if (isBSC) aliases += 'usdtb usdtbinance '
        if (isPolygon) aliases += 'usdtpoly usdtpolygon usdtmatic '
        if (isArb) aliases += 'usdtarb usdtarbitrum '
      }

      const compact = basic.replace(/\s+/g, '')
      
      return basic.includes(search.toLowerCase()) || 
             aliases.includes(q) || 
             compact.includes(q)
    })
  }, [CRYPTO_CURRENCIES, search])

  // Preview 立即触发（selectedCurrencyId 默认有值）
  const { data: preview, isLoading: isLoadingPreview } = api.order.getCryptoCheckoutPreview.useQuery(
    { productId, currency: selectedCurrencyId, quantity },
    { enabled: !!productId && !!selectedCurrencyId }
  ) as { data: CryptoCheckoutPreview | undefined; isLoading: boolean }

  const debouncedCurrency = useDebounce(selectedCurrencyId, 500)
  
  const { data: apiEstimate, isLoading: isEstimating } = api.order.getEstimate.useQuery(
    { 
      amount: (preview?.priceBreakdown?.totalAmount ?? 0) / 100,
      currencyTo: debouncedCurrency 
    },
    { 
      enabled: !!preview?.priceBreakdown?.totalAmount && !!debouncedCurrency,
      refetchOnWindowFocus: false 
    }
  ) as { data: CryptoEstimate | undefined; isLoading: boolean }

  useEffect(() => {
    if (preview?.minQuantity && quantity < preview.minQuantity) {
      setQuantity(preview.minQuantity)
    }
  }, [preview?.minQuantity, quantity])

  const checkout = api.order.checkout.useMutation()

  const hasTrackedViewRef = useRef(false)
  useEffect(() => {
    if (!productId) return
    if (hasTrackedViewRef.current) return
    hasTrackedViewRef.current = true
    track(BILLING_EVENTS.CRYPTO_CHECKOUT_VIEW, {
      product_id: productId,
      from: exitTo,
      default_currency_id: selectedCurrencyId,
    })
  }, [productId, exitTo, selectedCurrencyId])

  const handleCardPayment = async () => {
    if (!productId) return
    setIsCreating(true)
    try {
      track(BILLING_EVENTS.CRYPTO_CHECKOUT_SUBMIT, {
        product_id: productId,
        gateway: 'CARD_AUTO',
        quantity: 1,
        amount_usd: typeof preview?.priceBreakdown?.totalAmount === 'number'
          ? preview.priceBreakdown.totalAmount / 100
          : undefined,
        from: exitTo,
      })

      const from = encodeURIComponent(exitTo)
      const result = await checkout.mutateAsync({
        productId,
        quantity: 1,
        successUrl: `${window.location.origin}/payment/success?from=${from}`,
        cancelUrl: `${window.location.origin}/payment/select-crypto?productId=${productId}&from=${from}`,
      })
      
      if (result.status === 'OK' && result.url) {
        track(BILLING_EVENTS.CRYPTO_CHECKOUT_RESULT, {
          product_id: productId,
          gateway: 'CARD_AUTO',
          status: 'OK',
          order_id: result.orderId,
          payment_id: result.paymentId,
          url: result.url,
        })
        window.location.href = result.url
      } else if (result.status === 'CONFLICT') {
        track(BILLING_EVENTS.CRYPTO_CHECKOUT_RESULT, {
          product_id: productId,
          gateway: 'CARD_AUTO',
          status: 'CONFLICT',
          message: result.message,
        })
        toast.message(result.message)
        setIsCreating(false)
      } else {
        track(BILLING_EVENTS.CRYPTO_CHECKOUT_RESULT, {
          product_id: productId,
          gateway: 'CARD_AUTO',
          status: 'ERROR',
          error: 'NO_URL',
        })
        toast.error('Failed to create payment order.')
        setIsCreating(false)
      }
    } catch (e) {
      console.error(e)
      track(BILLING_EVENTS.CRYPTO_CHECKOUT_RESULT, {
        product_id: productId,
        gateway: 'CARD_AUTO',
        status: 'ERROR',
        error: e instanceof Error ? e.message : String(e),
      })
      toast.error('Failed to initiate card payment.')
      setIsCreating(false)
    }
  }

  const handleProceed = async () => {
    if (!productId || !selectedCurrencyId) return
    setIsCreating(true)
    try {
      track(BILLING_EVENTS.CRYPTO_CHECKOUT_SUBMIT, {
        product_id: productId,
        gateway: 'NOWPAYMENTS',
        currency_id: selectedCurrencyId,
        quantity,
        amount_usd: typeof preview?.priceBreakdown?.totalAmount === 'number'
          ? preview.priceBreakdown.totalAmount / 100
          : undefined,
        from: exitTo,
      })

      const from = encodeURIComponent(exitTo)
      const result = await checkout.mutateAsync({
        productId,
        gateway: 'NOWPAYMENTS',
        cryptoCurrency: selectedCurrencyId,
        quantity,
        successUrl: `${window.location.origin}/payment/success?from=${from}`,
        cancelUrl: `${window.location.origin}/payment/select-crypto?productId=${productId}&from=${from}`,
      })
      
      if (result.status === 'OK' && result.url) {
        track(BILLING_EVENTS.CRYPTO_CHECKOUT_RESULT, {
          product_id: productId,
          gateway: 'NOWPAYMENTS',
          status: 'OK',
          order_id: result.orderId,
          payment_id: result.paymentId,
          url: result.url,
        })
        window.location.href = result.url
      } else if (result.status === 'CONFLICT') {
        track(BILLING_EVENTS.CRYPTO_CHECKOUT_RESULT, {
          product_id: productId,
          gateway: 'NOWPAYMENTS',
          status: 'CONFLICT',
          message: result.message,
        })
        toast.message(result.message)
        setIsCreating(false)
      } else {
        track(BILLING_EVENTS.CRYPTO_CHECKOUT_RESULT, {
          product_id: productId,
          gateway: 'NOWPAYMENTS',
          status: 'ERROR',
          error: 'NO_URL',
        })
        toast.error('Failed to create payment order.')
        setIsCreating(false)
      }
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : String(e)
      track(BILLING_EVENTS.CRYPTO_CHECKOUT_RESULT, {
        product_id: productId,
        gateway: 'NOWPAYMENTS',
        status: 'ERROR',
        error: msg,
      })
      toast.error(msg)
      setIsCreating(false)
    }
  }

  // 从合并后的列表中查找选中项（优先后端数据有 logo）
  const selectedCurrency = CRYPTO_CURRENCIES.find(c => c.id === selectedCurrencyId) 
    ?? FALLBACK_TOP_CURRENCIES.find(c => c.id === selectedCurrencyId)
  const isSelectedHidden = !TOP_CURRENCY_IDS.includes(selectedCurrencyId as (typeof TOP_CURRENCY_IDS)[number])

  const handleIncrement = () => setQuantity(q => q + 1)
  const handleDecrement = () => setQuantity(q => Math.max(preview?.minQuantity ?? 1, q - 1))

  // 后端数据回来后校验选中项是否存在
  useEffect(() => {
    if (!currencies || (currencies as unknown as CryptoCurrency[]).length === 0) return
    
    const remote = currencies as unknown as CryptoCurrency[]
    const exists = remote.some((c) => c.id === selectedCurrencyId)
    if (!exists) {
      // 选中的 id 后端不存在，降级到第一个
      setSelectedCurrencyId(remote[0]!.id)
      toast.info('Selected network unavailable, switched to default.')
    }
  }, [currencies, selectedCurrencyId])

  if (!productId) return null

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col font-sans">
      <CryptoCheckoutHeader exitTo={exitTo} />

      <main className="flex-1 px-4 py-6 sm:max-w-md sm:mx-auto sm:w-full flex flex-col gap-6 pb-40">
        <CryptoOrderSummary
          isLoading={isLoadingPreview}
          preview={preview}
          quantity={quantity}
        />

        <CryptoQuantitySelector
          quantity={quantity}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          preview={preview}
        />

        <CryptoNetworkSelector
          topCurrencies={topList}
          selectedCurrencyId={selectedCurrencyId}
          selectedCurrency={selectedCurrency}
          isSelectedHidden={isSelectedHidden}
          onSelect={setSelectedCurrencyId}
          onOpenMore={() => setIsMoreOpen(true)}
        />
      </main>

      <CryptoCheckoutFooter
        preview={preview}
        estimate={apiEstimate}
        isEstimating={isEstimating}
        isCreating={isCreating}
        isLoadingPreview={isLoadingPreview}
        onProceed={handleProceed}
        onCardPayment={handleCardPayment}
      />

      <CryptoCurrencyPicker
        open={isMoreOpen}
        onOpenChange={setIsMoreOpen}
        currencies={filteredCurrencies}
        selectedCurrencyId={selectedCurrencyId}
        onSelect={setSelectedCurrencyId}
        search={search}
        onSearchChange={setSearch}
        isLoading={isLoadingCurrencies}
      />
    </div>
  )
}
