'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

type Props = {
  exitTo?: string | null
}

export function CryptoCheckoutHeader({ exitTo }: Props) {
  const router = useRouter()

  const handleBack = () => {
    router.replace(exitTo ?? '/')
  }

  return (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/40 px-4 h-14 flex items-center justify-between shrink-0">
      <Button 
        variant="ghost" 
        size="icon" 
        className="-ml-2 h-10 w-10 rounded-full text-foreground/80 hover:text-foreground" 
        onClick={handleBack}
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <motion.h1 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-base font-semibold text-foreground"
      >
        Checkout
      </motion.h1>
      <div className="w-8" />
    </header>
  )
}

