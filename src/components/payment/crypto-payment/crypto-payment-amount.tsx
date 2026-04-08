'use client'

import { Check, Copy } from 'lucide-react'
import { motion } from 'framer-motion'

interface CryptoPaymentAmountProps {
  amount: string
  currency: string
  isPartiallyPaid: boolean
  copiedKey: string | null
  onCopy: (text: string, key: string) => void
}

export function CryptoPaymentAmount({
  amount,
  currency,
  isPartiallyPaid,
  copiedKey,
  onCopy,
}: CryptoPaymentAmountProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className="text-center mb-6 sm:mb-8 w-full"
    >
      <button
        onClick={() => onCopy(amount, 'amount')}
        className="group relative inline-flex flex-col items-center"
      >
        <div className="flex items-baseline gap-2 text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
          {amount}
          <span className="text-lg sm:text-2xl font-bold text-muted-foreground">{currency}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-primary/80 group-hover:text-primary transition-colors bg-primary/5 px-2 py-0.5 rounded-full">
          {copiedKey === 'amount' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span>Tap to copy {isPartiallyPaid ? 'remaining amount' : 'amount'}</span>
        </div>
      </button>
    </motion.div>
  )
}

