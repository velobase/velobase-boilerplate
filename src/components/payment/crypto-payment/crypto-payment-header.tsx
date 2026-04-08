'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CryptoPaymentHeaderProps {
  backUrl: string
}

export function CryptoPaymentHeader({ backUrl }: CryptoPaymentHeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40 px-4 h-14 flex items-center justify-between shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="-ml-2 h-10 w-10 rounded-full text-foreground/80 hover:text-foreground"
        asChild
      >
        <Link href={backUrl} replace>
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <span className="text-base font-semibold text-foreground">Payment</span>
      <div className="w-8" />
    </header>
  )
}

