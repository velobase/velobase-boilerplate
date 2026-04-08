'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface CryptoPaymentStatusRingProps {
  createdAt: Date
  stop?: boolean
}

export function CryptoPaymentStatusRing({ createdAt, stop }: CryptoPaymentStatusRingProps) {
  const EXPIRE_MINUTES = 120
  const [progress, setProgress] = useState(100)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (stop) {
      setProgress(100)
      setTimeLeft('Detected')
      return
    }

    const start = createdAt.getTime()
    const end = start + EXPIRE_MINUTES * 60 * 1000
    const totalDuration = end - start

    const tick = () => {
      const now = Date.now()
      const remaining = Math.max(0, end - now)
      const p = (remaining / totalDuration) * 100

      setProgress(p)

      if (remaining <= 0) {
        setTimeLeft('Expired')
        return
      }

      const m = Math.floor(remaining / 60000)
      const s = Math.floor((remaining % 60000) / 1000)
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`)
    }

    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [createdAt, stop])

  return (
    <div className="relative flex items-center justify-center">
      {!stop && (
        <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-75" />
      )}

      <div
        className={cn(
          'relative z-10 flex items-center gap-2 backdrop-blur-sm border rounded-full px-4 py-1.5 shadow-sm transition-colors duration-500',
          stop
            ? 'bg-green-500/10 border-green-500/30 text-green-600'
            : 'bg-background/80 border-blue-500/30'
        )}
      >
        <div className="relative w-4 h-4 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-muted/30"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className={cn(
                'transition-all duration-1000 ease-linear',
                stop ? 'text-green-500' : 'text-blue-500'
              )}
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
          </svg>
        </div>
        <span className="text-xs font-mono font-medium text-foreground tabular-nums">
          {timeLeft}
        </span>
      </div>
    </div>
  )
}

