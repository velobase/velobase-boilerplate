'use client'

import { Check, Copy, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

interface CryptoPaymentAddressProps {
  address: string
  networkName: string
  isPartiallyPaid: boolean
  copiedKey: string | null
  onCopy: (text: string, key: string) => void
}

export function CryptoPaymentAddress({
  address,
  networkName,
  isPartiallyPaid,
  copiedKey,
  onCopy,
}: CryptoPaymentAddressProps) {
  return (
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
          onClick={() => onCopy(address, 'address')}
          className="w-full p-3.5 bg-muted/30 hover:bg-muted/50 border border-border rounded-xl flex items-center justify-between gap-3 transition-colors group active:scale-[0.99]"
        >
          <div className="font-mono text-sm break-all text-left text-foreground/90 leading-relaxed">
            {address}
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
  )
}

