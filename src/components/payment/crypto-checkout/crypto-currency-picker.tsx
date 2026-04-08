'use client'

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useIsMobile } from '@/hooks/use-mobile'
import { CryptoCurrencyItem } from './crypto-currency-item'
import type { CryptoCurrency } from './types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currencies: CryptoCurrency[]
  selectedCurrencyId: string
  onSelect: (id: string) => void
  search: string
  onSearchChange: (value: string) => void
  isLoading: boolean
}

// 骨架屏行
function CurrencyItemSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const isCompact = variant === 'compact'
  return (
    <div className={`flex items-center gap-3.5 ${isCompact ? 'p-3' : 'p-3.5'}`}>
      <Skeleton className={`shrink-0 rounded-full ${isCompact ? 'h-9 w-9' : 'h-11 w-11'}`} />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-5 w-5 rounded-full" />
    </div>
  )
}

export function CryptoCurrencyPicker({
  open,
  onOpenChange,
  currencies,
  selectedCurrencyId,
  onSelect,
  search,
  onSearchChange,
  isLoading,
}: Props) {
  const isMobile = useIsMobile()

  const handleSelect = (id: string) => {
    onSelect(id)
    onOpenChange(false)
  }

  const SearchInput = (
    <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2">
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search (USDT, BTC, Arbitrum...)"
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )

  // 骨架屏列表
  const SkeletonList = ({ count = 8, variant = 'default' }: { count?: number; variant?: 'default' | 'compact' }) => (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <CurrencyItemSkeleton key={i} variant={variant} />
      ))}
    </>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] rounded-t-[24px]">
          <DrawerHeader className="text-left border-b border-border/40 pb-4">
            <DrawerTitle>All Networks</DrawerTitle>
            <DrawerDescription>Choose a cryptocurrency for payment</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pt-3">
            {SearchInput}
          </div>
          <ScrollArea className="h-[60vh] overflow-y-auto">
            <div className="flex flex-col px-4 pt-2 pb-6">
              {isLoading ? (
                <SkeletonList count={10} variant="compact" />
              ) : (
                currencies.map(c => (
                  <CryptoCurrencyItem 
                    key={c.id} 
                    currency={c} 
                    isSelected={selectedCurrencyId === c.id}
                    onClick={() => handleSelect(c.id)} 
                    variant="compact"
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full max-h-[80vh] p-0 gap-0 overflow-hidden rounded-2xl grid grid-rows-[auto_auto_1fr]">
        <DialogHeader className="p-6 pb-2 border-b border-border/40 bg-muted/10">
          <DialogTitle>All Networks</DialogTitle>
          <DialogDescription>Choose a cryptocurrency for payment</DialogDescription>
        </DialogHeader>
        <div className="p-4 pb-3 border-b border-border/30">
          {SearchInput}
        </div>
        <ScrollArea className="min-h-0 h-full">
          <div className="flex flex-col p-2">
            {isLoading ? (
              <SkeletonList count={8} variant="default" />
            ) : (
              currencies.map(c => (
                <div key={c.id} className="p-1">
                  <CryptoCurrencyItem 
                    currency={c} 
                    isSelected={selectedCurrencyId === c.id}
                    onClick={() => handleSelect(c.id)} 
                    variant="default"
                  />
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
