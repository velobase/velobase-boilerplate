'use client';

import { cn } from '@/lib/utils';

type BillingInterval = 'MONTH' | 'YEAR';

interface BillingIntervalToggleProps {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
}

export function BillingIntervalToggle({ value, onChange }: BillingIntervalToggleProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <label className="text-xs text-slate-500 dark:text-slate-500 font-medium">
        Billing interval
      </label>
      <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent p-0.5 gap-0.5">
        <button
          onClick={() => onChange('MONTH')}
          aria-pressed={value === 'MONTH'}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1',
            value === 'MONTH'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => onChange('YEAR')}
          aria-pressed={value === 'YEAR'}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-1',
            value === 'YEAR'
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          )}
        >
          Yearly
        </button>
      </div>
    </div>
  );
}
