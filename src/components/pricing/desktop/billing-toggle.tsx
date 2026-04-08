
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
    <div className="flex items-center justify-center gap-4">
      <span className={cn("text-sm font-medium transition-colors", interval === 'month' ? "text-foreground" : "text-muted-foreground")}>
        Monthly
      </span>
      <Switch
        checked={interval === 'year'}
        onCheckedChange={(checked) => onIntervalChange(checked ? 'year' : 'month')}
        className="data-[state=checked]:bg-orange-600"
      />
      <span className={cn("text-sm font-medium transition-colors flex items-center gap-2", interval === 'year' ? "text-foreground" : "text-muted-foreground")}>
        Yearly
        <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 dark:text-orange-300 hover:bg-orange-500/30 border-0">
          Save 26%
        </Badge>
      </span>
    </div>
  );
}

