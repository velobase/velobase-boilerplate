'use client'

import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import type { CryptoCheckoutPreview, CryptoEstimate } from './types'

type Props = {
  preview?: CryptoCheckoutPreview
  estimate?: CryptoEstimate
  isEstimating: boolean
  isCreating: boolean
  isLoadingPreview: boolean
  onProceed: () => void
  onCardPayment: () => void
}

export function CryptoCheckoutFooter({
  preview,
  estimate,
  isEstimating,
  isCreating,
  isLoadingPreview,
  onProceed,
  onCardPayment,
}: Props) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/40 pb-safe pt-4 px-4 shadow-2xl shadow-background/50">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
        className="sm:max-w-md sm:mx-auto w-full space-y-3 pb-4"
      >
        {/* Estimated Crypto Amount */}
        {estimate && typeof estimate.estimatedAmount === 'number' && estimate.estimatedAmount > 0 && preview && (
          <div className="flex flex-col items-center justify-center mb-1 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="text-muted-foreground">You pay:</span>
              <span className="font-mono bg-muted/50 px-2 py-0.5 rounded border border-border/50">
                ≈ {estimate.estimatedAmount.toFixed(6)} {estimate.currencyTo.toUpperCase()}
              </span>
              {isEstimating && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-[10px] text-muted-foreground/80">
              Exchange rate locked at next step
            </p>
          </div>
        )}

        <Button 
          className="w-full h-12 rounded-[18px] text-[16px] font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all" 
          size="lg"
          onClick={onProceed}
          disabled={isCreating || isLoadingPreview || !preview?.isValid}
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <span className="flex items-center gap-1">
              Pay 
              {preview ? ` $${(preview.priceBreakdown.totalAmount / 100).toFixed(2)}` : ' Now'}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          className="w-full h-10 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          onClick={onCardPayment}
          disabled={isCreating}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Prefer to pay with Card?
        </Button>

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground/80 px-1">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="leading-snug">
            Secured via{' '}
            <a
              href="https://nowpayments.io"
              target="_blank"
              rel="noreferrer"
              className="text-foreground/80 underline underline-offset-2 hover:text-foreground"
            >
              NOWPayments
            </a>
            . We generate a unique address per order. We will never ask for your seed phrase or private keys.
          </p>
        </div>
      </motion.div>
    </footer>
  )
}

