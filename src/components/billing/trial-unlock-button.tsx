'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface TrialUnlockButtonProps {
  className?: string;
  size?: React.ComponentProps<typeof Button>['size'];
  variant?: React.ComponentProps<typeof Button>['variant'];
  children?: React.ReactNode;
}

/**
 * One-click unlock button for users who are currently on a Pro trial.
 *
 * Behavior:
 * - Subscription purchases are currently disabled (Telegram Stars only supports one-time credits packs today)
 */
export function TrialUnlockButton({
  className,
  size = 'sm',
  variant = 'default',
  children,
}: TrialUnlockButtonProps) {
  const utils = api.useUtils();
  const subscriptionsDisabled = false;

  const mutation = api.membership.earlyConvertTrial.useMutation({
    onSuccess: async () => {
      toast.success('Pro unlocked. Your first paid period is starting.');
      // Refresh billing status & credits balance
      await Promise.allSettled([
        utils.account.getBillingStatus.invalidate(),
        utils.billing.getBalance.invalidate(),
      ]);
    },
    onError: (err) => {
      // 后端会用更具体的错误信息，例如：No active trial cycle to convert
      toast.error(err.message || 'Failed to unlock Pro. Please try again.');
    },
  });

  const handleClick = async () => {
    if (subscriptionsDisabled) {
      toast.error('Subscriptions are temporarily unavailable. Please buy credits instead.');
      return;
    }
    if (mutation.isPending) return;
    await mutation.mutateAsync();
  };

  return (
    <Button
      size={size}
      variant={variant}
      className={cn(
        'inline-flex items-center gap-1.5',
        variant === 'default' &&
          'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-sm shadow-orange-500/30',
        className
      )}
      disabled={subscriptionsDisabled || mutation.isPending}
      onClick={handleClick}
    >
      {subscriptionsDisabled ? (
        <Zap className="w-3.5 h-3.5" />
      ) : mutation.isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Zap className="w-3.5 h-3.5" />
      )}
      <span className="text-xs font-semibold">
        {subscriptionsDisabled ? 'Subscriptions temporarily unavailable' : (children ?? 'Unlock Pro Now')}
      </span>
    </Button>
  );
}


