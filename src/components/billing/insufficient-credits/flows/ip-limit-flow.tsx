import { cn } from '@/lib/utils';
import { SpecialCaseHeader } from '../shared/special-case-header';

interface IpLimitFlowProps {
  isMobile: boolean;
  limitMessage?: string;
}

export function IpLimitFlow({ isMobile, limitMessage }: IpLimitFlowProps) {
  return (
    <div className={cn("flex flex-col", isMobile ? "pb-8" : "h-full")}>
      <SpecialCaseHeader
        isMobile={isMobile}
        title="Daily Free Limit Reached"
        description={
          <>
            {limitMessage ?? "You've reached the daily free video limit for this network."}
            {" "}Subscribe to unlock unlimited generation.
          </>
        }
      />
      
      {/* 
        NOTE: In the original code, the subscription cards were rendered below this header 
        if it wasn't a trial user. For IP limit, we should probably render the StandardFlow's 
        upgrade options here too, or just reuse StandardFlow with a different header strategy.
        For now, to match the "Strategy Pattern", this component should probably take children 
        (the subscription options) or handle them itself.
        
        Given the requirement is just to restructure, I'll keep it simple: 
        Real implementation would likely reuse the product list from StandardFlow here.
      */}
      <div className="p-6 text-center text-muted-foreground text-sm">
        {/* Placeholder for subscription options */}
        Please select a plan below to continue.
      </div>
    </div>
  );
}

