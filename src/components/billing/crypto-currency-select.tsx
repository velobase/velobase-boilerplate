'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bitcoin, Coins, Zap } from 'lucide-react'

export interface CryptoCurrency {
  id: string
  name: string
  network: string
  symbol: string
  label: string
  icon?: React.ReactNode
  badges?: ('popular' | 'low-fee' | 'fast')[]
}

export const CRYPTO_CURRENCIES: CryptoCurrency[] = [
  {
    id: 'usdttrc20',
    name: 'Tether USD',
    network: 'TRC20',
    symbol: 'USDT',
    label: 'USDT (TRC20)',
    badges: ['popular', 'low-fee', 'fast'],
  },
  {
    id: 'btc',
    name: 'Bitcoin',
    network: 'Bitcoin',
    symbol: 'BTC',
    label: 'Bitcoin (BTC)',
    badges: ['popular'],
  },
  {
    id: 'eth',
    name: 'Ethereum',
    network: 'Ethereum',
    symbol: 'ETH',
    label: 'Ethereum (ETH)',
  },
  {
    id: 'usdcarb',
    name: 'USD Coin',
    network: 'Arbitrum',
    symbol: 'USDC',
    label: 'USDC (Arbitrum)',
    badges: ['low-fee'],
  },
  {
    id: 'usdtbsc',
    name: 'Tether USD',
    network: 'BSC',
    symbol: 'USDT',
    label: 'USDT (BSC)',
    badges: ['low-fee'],
  },
  {
    id: 'usdcsol',
    name: 'USD Coin',
    network: 'Solana',
    symbol: 'USDC',
    label: 'USDC (Solana)',
    badges: ['low-fee', 'fast'],
  },
  {
    id: 'ltc',
    name: 'Litecoin',
    network: 'Litecoin',
    symbol: 'LTC',
    label: 'Litecoin (LTC)',
    badges: ['low-fee'],
  },
  {
    id: 'trx',
    name: 'Tron',
    network: 'Tron',
    symbol: 'TRX',
    label: 'Tron (TRX)',
    badges: ['low-fee', 'fast'],
  },
  {
    id: 'ton',
    name: 'Toncoin',
    network: 'TON',
    symbol: 'TON',
    label: 'Toncoin (TON)',
  },
]

interface CryptoCurrencySelectProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (currencyId: string) => void
  loading?: boolean
}

export function CryptoCurrencySelect({
  open,
  onOpenChange,
  onSelect,
  loading,
}: CryptoCurrencySelectProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Cryptocurrency</DialogTitle>
          <DialogDescription>
            Choose a cryptocurrency network for payment.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-4 px-4">
          <div className="grid gap-2 py-2">
            {CRYPTO_CURRENCIES.map((currency) => (
              <Button
                key={currency.id}
                variant="outline"
                className="flex items-center justify-between h-auto py-3 px-4 hover:bg-accent/50"
                onClick={() => onSelect(currency.id)}
                disabled={loading}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {currency.symbol === 'BTC' ? (
                      <Bitcoin className="h-5 w-5 text-orange-500" />
                    ) : currency.symbol === 'ETH' ? (
                      <Coins className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Zap className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-semibold">{currency.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {currency.network} Network
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currency.badges?.includes('popular') && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200">
                      Popular
                    </Badge>
                  )}
                  {currency.badges?.includes('low-fee') && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
                      Low Fee
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

