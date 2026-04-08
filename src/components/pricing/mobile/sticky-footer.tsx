
'use client';

import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface StickyFooterProps {
  displayPrice: string;
  isLoading: boolean;
  isCurrentPlan: boolean;
  onUpgrade: () => void;
  disabled?: boolean;
}

export function StickyFooter({ displayPrice, isLoading, isCurrentPlan, onUpgrade, disabled = false }: StickyFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border z-50 pb-8">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <div className="flex-1">
            <div className="text-xs text-orange-600 dark:text-orange-300 font-medium mb-0.5">Best Value</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-foreground">{displayPrice}</span>
              <span className="text-xs text-muted-foreground">/mo</span>
            </div>
          </div>
          <Button 
            className="flex-[2] h-12 rounded-xl text-base font-bold shadow-lg"
            onClick={disabled ? undefined : onUpgrade}
            disabled={disabled || isLoading || isCurrentPlan}
          >
            {isLoading ? <Sparkles className="animate-spin" /> : (disabled ? 'Temporarily unavailable' : (isCurrentPlan ? 'Current Plan' : 'Upgrade Now'))}
          </Button>
        </div>
    </div>
  );
}
