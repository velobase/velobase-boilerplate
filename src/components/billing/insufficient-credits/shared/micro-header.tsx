import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { CreditsGapStatusBar } from './credits-gap-status-bar';

interface MicroHeaderProps {
  isMobile: boolean;
  requiredCredits: number;
  currentBalance: number;
}

export function MicroHeader({ isMobile, requiredCredits, currentBalance }: MicroHeaderProps) {
  const HeaderComp = isMobile ? DrawerHeader : DialogHeader;
  const TitleComp = isMobile ? DrawerTitle : DialogTitle;
  const DescComp = isMobile ? DrawerDescription : DialogDescription;

  return (
    <div className={cn("p-6 pb-2", isMobile && "shrink-0")}>
       <HeaderComp className="text-left space-y-3">
         <TitleComp className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
           Insufficient Credits
         </TitleComp>
         
         <CreditsGapStatusBar requiredCredits={requiredCredits} currentBalance={currentBalance} />
         
         <DescComp className="sr-only">
           You need {requiredCredits} credits but only have {currentBalance}. Top up to continue.
         </DescComp>
       </HeaderComp>
    </div>
  );
}

