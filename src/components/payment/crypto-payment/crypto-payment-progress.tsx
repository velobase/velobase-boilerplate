'use client'

import { cn } from '@/lib/utils'
import type { ProgressStep } from './types'

interface CryptoPaymentProgressProps {
  steps: ProgressStep[]
}

export function CryptoPaymentProgress({ steps }: CryptoPaymentProgressProps) {
  return (
    <div className="w-full bg-muted/20 border border-border/50 rounded-2xl p-4">
      <div className="flex flex-col gap-4">
        {steps.map((s) => (
          <div key={s.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <div
                className={cn(
                  'h-3 w-3 rounded-full transition-all duration-500',
                  s.state === 'done'
                    ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                    : s.state === 'active'
                      ? 'bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                      : 'bg-muted-foreground/20 border border-muted-foreground/30'
                )}
              />
              <div
                className={cn(
                  'w-px flex-1 mt-1 transition-colors duration-500',
                  s.key === 'finished' ? 'hidden' : 'block',
                  s.state === 'done' ? 'bg-green-500/40' : 'bg-border'
                )}
                style={{ minHeight: 18 }}
              />
            </div>
            <div className="flex-1 -mt-0.5">
              <div
                className={cn(
                  'text-sm font-medium transition-colors duration-300',
                  s.state === 'todo' ? 'text-muted-foreground' : 'text-foreground'
                )}
              >
                {s.title}
              </div>
              <div className="text-xs text-muted-foreground/80 mt-0.5 leading-snug">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

