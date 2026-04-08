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
import { Sparkles } from 'lucide-react';

interface SpecialCaseHeaderProps {
  isMobile: boolean;
  title: string;
  description: React.ReactNode;
  children?: React.ReactNode;
}

export function SpecialCaseHeader({ isMobile, title, description, children }: SpecialCaseHeaderProps) {
  const HeaderComp = isMobile ? DrawerHeader : DialogHeader;
  const TitleComp = isMobile ? DrawerTitle : DialogTitle;
  const DescComp = isMobile ? DrawerDescription : DialogDescription;

  return (
    <div className={cn("p-6 pb-2", isMobile && "shrink-0")}>
      <HeaderComp className="text-left">
        <TitleComp className="text-2xl text-foreground flex items-center gap-2">
          <Sparkles className={cn("w-5 h-5 text-orange-500 fill-orange-500", isMobile && "hidden xs:block")} />
          {title}
        </TitleComp>
        <DescComp className={cn("text-base mt-2 text-muted-foreground", isMobile && "line-clamp-2 text-sm")}>
          {description}
        </DescComp>
        {children}
      </HeaderComp>
    </div>
  );
}

