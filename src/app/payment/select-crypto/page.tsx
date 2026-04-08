import { Suspense } from 'react'
import { CryptoCheckoutPage } from '@/components/payment/crypto-checkout'

export default function SelectCryptoPage() {
  return (
    <Suspense>
      <CryptoCheckoutPage />
    </Suspense>
  )
}
