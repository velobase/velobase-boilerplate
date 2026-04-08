'use client'

import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Minus, Plus, Info, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type { CryptoCheckoutPreview } from './types'

type Props = {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
  preview?: CryptoCheckoutPreview
}

export function CryptoQuantitySelector({ quantity, onIncrement, onDecrement, preview }: Props) {
  const product = preview?.product

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card rounded-[20px] p-5 border border-border/60 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">Duration</h3>
          <p className="text-xs text-muted-foreground">
            {product?.interval === 'WEEK' ? 'How many weeks?' : product?.interval === 'MONTH' ? 'How many months?' : product?.interval === 'YEAR' ? 'How many years?' : 'Quantity'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-full border border-border/40">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onDecrement}
            disabled={quantity <= (preview?.minQuantity ?? 1)}
            className="h-8 w-8 rounded-full hover:bg-background shadow-sm disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <span className="w-8 text-center font-bold font-mono text-lg">{quantity}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onIncrement}
            className="h-8 w-8 rounded-full hover:bg-background shadow-sm"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Network Minimum Explanation */}
      {preview?.minQuantity && preview.minQuantity > 1 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3.5 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              Minimum Order Adjusted
            </p>
            <p className="text-xs text-amber-700/90 dark:text-amber-500/90 leading-relaxed">
              Transactions below <span className="font-medium">${preview.minAmount.usd.toFixed(2)}</span> cannot be processed due to network processing requirements.
              We&apos;ve adjusted the quantity to meet this minimum.
            </p>
          </div>
        </div>
      )}

      {/* Price Breakdown */}
      {preview?.priceBreakdown && (
        <div className="pt-3 border-t border-border/40 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{product?.unitPrice ? `$${(product.unitPrice / 100).toFixed(2)}` : '-'} × {quantity}</span>
            <span>${(preview.priceBreakdown.baseAmount / 100).toFixed(2)}</span>
          </div>
          {preview.priceBreakdown.tronSurchargeAmount > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {preview.priceBreakdown.tronSurchargeLabel ?? "TRON network fee"}
                <span className="px-1 py-0.5 bg-muted rounded text-[9px] uppercase">HIGH FEE</span>
              </span>
              <span>+ ${(preview.priceBreakdown.tronSurchargeAmount / 100).toFixed(2)}</span>
            </div>
          )}

          {preview.invalidReason && (
            <Alert variant="destructive" className="py-2 px-3 border-0 bg-red-500/10 text-red-600 dark:text-red-400 mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs ml-2 font-medium">
                {preview.invalidReason}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </motion.div>
  )
}

