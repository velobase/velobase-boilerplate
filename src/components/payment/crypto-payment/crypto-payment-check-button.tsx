'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CryptoPaymentCheckButtonProps {
  isManualChecking: boolean
  checkingPhase: number
  onCheck: () => void
}

function getCheckingText(phase: number) {
  switch (phase) {
    case 0:
      return 'Connecting to blockchain node...'
    case 1:
      return 'Scanning recent blocks...'
    case 2:
      return 'Verifying transaction hash...'
    case 3:
      return 'Still syncing, please wait...'
    default:
      return 'Checking status...'
  }
}

export function CryptoPaymentCheckButton({
  isManualChecking,
  checkingPhase,
  onCheck,
}: CryptoPaymentCheckButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4 }}
      className="w-full mt-2"
    >
      <Button
        variant="outline"
        className={cn(
          'w-full h-12 rounded-xl transition-all gap-2 border-border/60',
          isManualChecking
            ? 'bg-primary/5 border-primary/20 text-primary'
            : 'hover:bg-primary/5 hover:border-primary/50 hover:text-foreground text-muted-foreground border-dashed'
        )}
        onClick={onCheck}
        disabled={isManualChecking}
      >
        {isManualChecking ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="animate-pulse">{getCheckingText(checkingPhase)}</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            <span>I have sent the payment</span>
          </>
        )}
      </Button>
    </motion.div>
  )
}

