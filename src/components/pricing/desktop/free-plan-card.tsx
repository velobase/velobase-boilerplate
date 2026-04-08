
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import Link from 'next/link';

interface FreePlanCardProps {
  userTier: 'FREE' | 'STARTER' | 'PLUS' | 'PREMIUM';
  isLoggedIn: boolean;
}

export function FreePlanCard({ userTier, isLoggedIn }: FreePlanCardProps) {
  const isCurrentPlan = userTier === 'FREE';
  
  return (
    <div className="relative p-8 rounded-3xl border border-border bg-card backdrop-blur-sm flex flex-col h-full">
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-foreground mb-2">Free</h3>
        <div className="text-3xl font-bold text-foreground mb-1">$0</div>
        <p className="text-muted-foreground text-sm">For trying out AI SaaS</p>
      </div>
      
      <ul className="space-y-4 mb-8 flex-1">
        <FeatureItem active={true}>Welcome credits on signup</FeatureItem>
        <FeatureItem active={false} text="Standard queue time" />
        <FeatureItem active={false} text="Standard license" />
      </ul>

      <Button 
        variant="outline" 
        className="w-full h-12 rounded-xl"
        disabled={isLoggedIn}
        asChild={!isLoggedIn}
      >
        {!isLoggedIn ? (
           <Link href="/api/auth/signin">Get Started</Link>
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : (
          'Included'
        )}
      </Button>
    </div>
  );
}

function FeatureItem({ children, active, text }: { children?: React.ReactNode, active: boolean, text?: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className={cn(
        "flex items-center justify-center w-5 h-5 rounded-full shrink-0 mt-0.5",
        active ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground/40"
      )}>
        {active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
      <span className={cn(
        "text-sm",
        active ? "text-foreground/80" : "text-muted-foreground/50 line-through"
      )}>
        {text || children}
      </span>
    </li>
  )
}
