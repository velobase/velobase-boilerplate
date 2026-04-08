'use client'

import { Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import type { CryptoCheckoutPreview } from './types'

type Props = {
  isLoading: boolean
  preview?: CryptoCheckoutPreview
  quantity: number
}

export function CryptoOrderSummary({ isLoading, preview, quantity }: Props) {
  const product = preview?.product

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="bg-muted/30 rounded-[20px] p-5 border border-border/50 shadow-sm relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <Lock className="w-16 h-16 -rotate-12" />
      </div>
      
      <div className="relative z-10">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 w-20 bg-muted-foreground/10 rounded" />
            <div className="h-8 w-32 bg-muted-foreground/10 rounded" />
          </div>
        ) : (
          <>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Order Summary</p>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {product ? `$${((preview?.priceBreakdown?.baseAmount ?? 0) / 100).toFixed(2)}` : '$-'}
                </h2>
                {preview?.priceBreakdown &&
                  (preview.priceBreakdown.tronSurchargeAmount ?? 0) > 0 && (
                  <span className="text-[11px] font-medium text-muted-foreground">
                    + network fee&nbsp;
                    <span className="font-mono tabular-nums">
                      ${((preview.priceBreakdown.tronSurchargeAmount ?? 0) / 100).toFixed(2)}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-foreground/70 line-clamp-1 pr-4">
                {product?.name} 
                {quantity > 1 && <span className="text-primary ml-1">x {quantity}</span>}
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

