'use client'

import { MoreHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import { CryptoCurrencyItem } from './crypto-currency-item'
import type { CryptoCurrency } from './types'

type Props = {
  topCurrencies: CryptoCurrency[]
  selectedCurrencyId: string
  selectedCurrency?: CryptoCurrency
  isSelectedHidden: boolean
  onSelect: (id: string) => void
  onOpenMore: () => void
}

export function CryptoNetworkSelector({
  topCurrencies,
  selectedCurrencyId,
  selectedCurrency,
  isSelectedHidden,
  onSelect,
  onOpenMore,
}: Props) {
  return (
    <div className="space-y-3">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between px-1"
      >
        <h3 className="text-sm font-semibold text-foreground/80">Select Network</h3>
      </motion.div>
      
      <div className="flex flex-col gap-2.5">
        {isSelectedHidden ? (
          selectedCurrency ? (
            <CryptoCurrencyItem
              currency={selectedCurrency}
              isSelected={true}
              onClick={onOpenMore}
            />
          ) : null
        ) : (
          topCurrencies.map((c) => (
            <CryptoCurrencyItem
              key={c.id}
              currency={c}
              isSelected={selectedCurrencyId === c.id}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}

        <button
          onClick={onOpenMore}
          className="flex items-center justify-center w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/30 text-foreground hover:from-blue-500/20 hover:via-purple-500/20 hover:to-pink-500/20 hover:border-blue-500/50 transition-all gap-2.5 text-sm font-semibold active:scale-[0.98] shadow-sm"
        >
          <MoreHorizontal className="w-4.5 h-4.5" />
          <span>BTC, ETH, SOL & 50+ Networks</span>
        </button>
      </div>
    </div>
  )
}

