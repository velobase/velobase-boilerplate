import { cn } from '@/lib/utils';
import { Wallet } from 'lucide-react';

interface CreditsGapStatusBarProps {
  requiredCredits: number;
  currentBalance: number;
}

export function CreditsGapStatusBar({ requiredCredits, currentBalance }: CreditsGapStatusBarProps) {
  return (
    <div className="bg-muted/40 rounded-lg p-2.5 px-4 flex flex-col xs:flex-row items-center justify-between text-sm border border-border/60 gap-2 xs:gap-0">
      <div className="flex items-center gap-2 w-full xs:w-auto justify-between xs:justify-start">
        <span className="text-muted-foreground">Required:</span>
        <span className="font-semibold text-foreground">{requiredCredits}</span>
      </div>
      
      <div className="hidden xs:block h-4 w-px bg-border/60 mx-4" />
      
      <div className="flex items-center gap-2 w-full xs:w-auto justify-between xs:justify-start">
        <span className="text-muted-foreground">Your Balance:</span>
        <span className={cn("font-semibold flex items-center gap-1.5", currentBalance < requiredCredits ? "text-destructive" : "text-foreground")}>
          {currentBalance}
          <Wallet className="w-3.5 h-3.5 opacity-70" />
        </span>
      </div>
    </div>
  );
}

