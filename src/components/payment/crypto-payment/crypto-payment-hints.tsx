'use client'

import { RefreshCw, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

export function CryptoPaymentHints() {
  return (
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
  )
}

