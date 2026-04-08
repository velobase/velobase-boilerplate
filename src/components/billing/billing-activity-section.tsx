'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityRecord {
  id: string;
  operationType: string;
  amount: number;
  description?: string | null;
  createdAt: Date | string;
}

interface BillingActivitySectionProps {
  records: ActivityRecord[];
}

export function BillingActivitySection({ records }: BillingActivitySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (records.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        Recent Activity ({records.length})
      </button>
      
      {isExpanded && (
        <Card className="border-border/40 bg-card/40 backdrop-blur-md overflow-hidden">
          <div className="divide-y divide-border/40">
            {records.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                    r.operationType === 'GRANT' 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  )}>
                    {r.operationType === 'GRANT' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">
                      {r.description || 'Transaction'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "text-sm font-semibold tabular-nums",
                  r.operationType === 'GRANT' 
                    ? "text-emerald-600 dark:text-emerald-400" 
                    : "text-slate-900 dark:text-slate-100"
                )}>
                  {r.operationType === 'GRANT' ? '+' : '-'}{Math.abs(r.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-border/40 bg-muted/20">
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-8">
              View all history
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

