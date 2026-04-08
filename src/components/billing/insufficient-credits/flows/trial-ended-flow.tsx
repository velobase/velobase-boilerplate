import { cn } from '@/lib/utils';
import { SpecialCaseHeader } from '../shared/special-case-header';
import { TrialUnlockButton } from '../../trial-unlock-button';

interface TrialEndedFlowProps {
  isMobile: boolean;
  handlePurchase: (id: string, credits: number, price: number, kind?: 'credits' | 'subscription') => void | Promise<void>;
}

export function TrialEndedFlow({ isMobile }: TrialEndedFlowProps) {
  return (
    <div className={cn("flex flex-col", isMobile ? "pb-8" : "h-full")}>
      <SpecialCaseHeader
        isMobile={isMobile}
        title="Trial Credits Used Up"
        description={
          <>
            <span className="font-medium text-foreground">Wow, you&apos;re moving fast!</span>
            <br />
            You&apos;ve already used all 2,000 trial credits. To keep creating without interruption, skip the wait and start your full plan today.
          </>
        }
      >
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <TrialUnlockButton size="lg" className="w-full max-w-sm text-base h-11 shadow-md font-semibold">
            Start Full Subscription
          </TrialUnlockButton>
          <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
              <span>Get <span className="text-foreground font-medium">30,000 credits</span> immediately</span>
              <span>Subscriptions are temporarily unavailable. Please buy credits instead.</span>
          </div>
        </div>
      </SpecialCaseHeader>
    </div>
  );
}

