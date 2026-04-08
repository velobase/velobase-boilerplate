'use client'

import { Check, Copy, Clock, ExternalLink, Hash, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CryptoPaymentReceiptProps {
  paymentId: string
  npStatus: string
  actuallyPaid: number | undefined
  payAmount: number | undefined
  currency: string
  payinHash: string | undefined
  copiedKey: string | null
  onCopy: (text: string, key: string) => void
}

function getExplorerTxUrl(currency: string, txHash: string): string | null {
  const c = currency.toLowerCase()

  // Native chains
  if (c === 'ltc') return `https://blockchair.com/litecoin/transaction/${txHash}`
  if (c === 'btc') return `https://blockchair.com/bitcoin/transaction/${txHash}`
  if (c === 'doge') return `https://blockchair.com/dogecoin/transaction/${txHash}`
  if (c === 'eth') return `https://etherscan.io/tx/${txHash}`
  if (c === 'trx') return `https://tronscan.org/#/transaction/${txHash}`
  if (c === 'ton') return `https://tonviewer.com/transaction/${txHash}`
  if (c === 'matic') return `https://polygonscan.com/tx/${txHash}`

  // Networks / wrapped ids we use in UI
  if (c.includes('trc20')) return `https://tronscan.org/#/transaction/${txHash}`
  if (c.includes('bsc')) return `https://bscscan.com/tx/${txHash}`
  if (c.includes('arb')) return `https://arbiscan.io/tx/${txHash}`
  if (c.includes('sol')) return `https://solscan.io/tx/${txHash}`
  if (c.includes('matic') || c.includes('polygon')) return `https://polygonscan.com/tx/${txHash}`
  if (c.includes('erc20')) return `https://etherscan.io/tx/${txHash}`

  return null
}

export function CryptoPaymentReceipt({
  paymentId,
  npStatus,
  actuallyPaid,
  payAmount,
  currency,
  payinHash,
  copiedKey,
  onCopy,
}: CryptoPaymentReceiptProps) {
  const explorerUrl = payinHash ? getExplorerTxUrl(currency, payinHash) : null

  return (
    <div className="w-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-500/10 rounded-full">
            <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-sm font-semibold text-foreground">Payment Receipt</span>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground bg-background/50 px-2 py-1 rounded border border-border/30">
          ID: {paymentId.slice(-8).toUpperCase()}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status</span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
              npStatus === 'finished'
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
            )}
          >
            {npStatus.replace('_', ' ')}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Amount Paid</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-mono font-medium text-foreground">
              {actuallyPaid ?? payAmount ?? '-'}
            </span>
            <span className="text-xs text-muted-foreground">{currency}</span>
          </div>
        </div>

        {payinHash && (
          <div className="flex flex-col gap-1.5 pt-2 border-t border-border/30">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Hash className="w-3 h-3" /> Transaction Hash
              </span>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline underline-offset-2 inline-flex items-center gap-1"
                >
                  View on explorer <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <button
              onClick={() => onCopy(payinHash, 'hash')}
              className="flex items-center justify-between p-2 bg-muted/30 hover:bg-muted/50 rounded-lg border border-border/30 transition-colors group text-left"
            >
              <span className="text-xs font-mono text-foreground/80 truncate pr-2 w-[200px] sm:w-[280px]">
                {payinHash}
              </span>
              {copiedKey === 'hash' ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}

