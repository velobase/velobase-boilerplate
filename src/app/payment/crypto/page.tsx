import { auth } from '@/server/auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { CryptoPaymentPage } from '@/components/payment/crypto-payment'

export default async function PaymentCryptoPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; paymentId?: string; from?: string }>
}) {
  const params = await searchParams
  const session = await auth()
  if (!session) {
    const search = new URLSearchParams()
    search.set('signin', '1')
    search.set(
      'next',
      `/payment/crypto${
        params?.orderId || params?.paymentId
          ? `?${new URLSearchParams({
              ...(params?.orderId ? { orderId: params.orderId } : {}),
              ...(params?.paymentId ? { paymentId: params.paymentId } : {}),
              ...(params?.from ? { from: params.from } : {}),
            }).toString()}`
          : ''
      }`
    )
    redirect(`/?${search.toString()}`)
  }

  return (
    <Suspense>
      <CryptoPaymentPage />
    </Suspense>
  )
}
