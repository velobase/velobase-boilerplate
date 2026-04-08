'use client'

import { AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

interface CryptoPaymentPartialWarningProps {
  actuallyPaid: number | undefined
  currency: string
}

export function CryptoPaymentPartialWarning({
  actuallyPaid,
  currency,
}: CryptoPaymentPartialWarningProps) {
  return (
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
        We received <span className="font-mono font-medium">{actuallyPaid}</span> {currency}.
        <br />
        Please send the remaining amount below.
      </p>
    </motion.div>
  )
}

