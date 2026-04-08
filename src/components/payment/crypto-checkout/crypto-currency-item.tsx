'use client'

import { cn } from '@/lib/utils'
import { Bitcoin, Coins, Zap, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CryptoCurrency } from './types'

type CurrencyItemProps = {
  currency: CryptoCurrency
  isSelected: boolean
  onClick: () => void
  variant?: 'default' | 'compact'
}

export function CryptoCurrencyItem({ currency, isSelected, onClick, variant = 'default' }: CurrencyItemProps) {
  return (
    <motion.button
      layout
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "group relative flex items-center justify-between w-full overflow-hidden",
        variant === 'default' ? "p-3.5 rounded-2xl border bg-card" : "p-3 rounded-xl border-b last:border-0 hover:bg-muted/50",
        isSelected && variant === 'default'
          ? "border-primary/50 ring-1 ring-primary/20 bg-primary/[0.03] shadow-sm" 
          : "border-border/60 hover:border-border hover:bg-muted/30"
      )}
    >
      {/* Selection Background Fill Animation */}
      {isSelected && variant === 'default' && (
        <motion.div
          layoutId="selection-bg"
          className="absolute inset-0 bg-primary/[0.03] z-0"
          initial={false}
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}

      <div className="flex items-center gap-3.5 min-w-0 z-10 relative">
        <div className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-background border shadow-sm transition-transform overflow-hidden",
          variant === 'default' ? "h-11 w-11" : "h-9 w-9"
        )}>
          {currency.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={currency.logoUrl} 
              alt={currency.symbol} 
              className="w-full h-full object-cover p-1.5"
            />
          ) : currency.symbol === 'BTC' ? (
            <Bitcoin className={cn("text-orange-500", variant === 'default' ? "h-6 w-6" : "h-5 w-5")} />
          ) : currency.symbol === 'ETH' ? (
            <Coins className={cn("text-blue-500", variant === 'default' ? "h-6 w-6" : "h-5 w-5")} />
          ) : (
            <Zap className={cn("text-green-500", variant === 'default' ? "h-6 w-6" : "h-5 w-5")} />
          )}
        </div>
        <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 w-full flex-wrap">
            <p className={cn("font-semibold text-foreground truncate", variant === 'default' ? "text-[15px]" : "text-sm")}>
              {currency.label}
            </p>
            
            {/* Desktop: Badges inline */}
            <div className="hidden sm:flex items-center gap-1.5">
              {currency.badges?.map(badge => {
                const colors = {
                  'low-fee': 'bg-green-500/10 text-green-600 dark:text-green-400',
                  'high-fee': 'bg-red-500/10 text-red-600 dark:text-red-400',
                  'popular': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  'fast': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                }
                const label = badge === 'high-fee' ? 'High Fee' : badge.replace('-', ' ')
                return (
                  <span 
                    key={badge}
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap",
                      colors[badge] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Mobile/Compact: Badges and Network info in a flow */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 w-full text-xs text-muted-foreground font-medium">
            <span className="truncate">{currency.network}</span>
            
            {/* Mobile Badges */}
            <div className="sm:hidden flex items-center gap-1.5">
              {currency.badges?.map(badge => {
                if (variant === 'compact' && badge !== 'high-fee' && badge !== 'low-fee') return null

                const colors = {
                  'low-fee': 'bg-green-500/10 text-green-600 dark:text-green-400',
                  'high-fee': 'bg-red-500/10 text-red-600 dark:text-red-400',
                  'popular': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  'fast': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                }
                const label = badge === 'high-fee' ? 'High Fee' : badge.replace('-', ' ')
                return (
                  <span 
                    key={badge}
                    className={cn(
                      "inline-flex items-center rounded-full px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide whitespace-nowrap border border-transparent",
                      colors[badge] ?? "bg-muted text-muted-foreground",
                      badge === 'high-fee' && "border-red-500/20"
                    )}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      
      <div className="pl-3 shrink-0 z-10 relative">
        <AnimatePresence mode="wait" initial={false}>
          {isSelected ? (
            <motion.div
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <CheckCircle2 className="h-5 w-5 text-primary fill-primary/10" />
            </motion.div>
          ) : (
            <motion.div
              key="circle"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20 group-hover:border-muted-foreground/40 transition-colors" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  )
}

