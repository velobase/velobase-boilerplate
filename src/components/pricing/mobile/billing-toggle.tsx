
'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface BillingToggleProps {
  interval: 'month' | 'year';
  onIntervalChange: (interval: 'month' | 'year') => void;
}

export function BillingToggle({ interval, onIntervalChange }: BillingToggleProps) {
  return (
    <div className="mb-8 flex flex-col items-center gap-4 top-[64px] z-20 bg-background/90 backdrop-blur-xl py-4 border-b border-border -mx-4 px-4">
      <div className="flex items-center gap-3">
        <span className={cn("text-sm font-medium", interval === 'month' ? "text-foreground" : "text-muted-foreground")}>
          Monthly
        </span>
        <Switch
          checked={interval === 'year'}
          onCheckedChange={(checked) => onIntervalChange(checked ? 'year' : 'month')}
          className="data-[state=checked]:bg-orange-600"
        />
        <span className={cn("text-sm font-medium flex items-center gap-1.5", interval === 'year' ? "text-foreground" : "text-muted-foreground")}>
          Yearly
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 dark:text-orange-300 text-[10px] h-5 px-1.5 border-0">
            -26%
          </Badge>
        </span>
      </div>
    </div>
  );
}

