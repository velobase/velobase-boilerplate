"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Crown,
  Wallet,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Rocket
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

export function MobileAffiliateLanding() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const activateMutation = api.affiliate.activate.useMutation({
    onSuccess: () => {
      setIsOpen(false);
      toast.success("Welcome to the partner program!");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to activate partner status");
    }
  });

  const handleJoin = () => {
    activateMutation.mutate();
  };

  const isLoading = activateMutation.isPending;

  return (
    <div className="flex flex-col flex-1 min-h-[80vh] relative">
      {/* Background Ambience */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-10 pb-24 space-y-8">
        
        <div className="relative">
          <div className="absolute -inset-4 bg-amber-500/20 blur-xl rounded-full animate-pulse" />
          <div className="relative w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl rotate-3">
            <Crown className="w-10 h-10 text-white fill-white/20" />
          </div>
        </div>

        <div className="space-y-4 max-w-xs">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Become a <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Vibe Partner
            </span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Turn your influence into income. Earn recurring revenue for every user you refer.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid gap-4 w-full max-w-sm text-left">
          <BenefitItem 
            icon={<Wallet className="w-5 h-5 text-green-500" />}
            title="30% Lifetime Commission"
            desc="Earn on every payment, forever."
          />
          <BenefitItem 
            icon={<Rocket className="w-5 h-5 text-blue-500" />}
            title="Instant Activation"
            desc="Get your link in seconds."
          />
          <BenefitItem 
            icon={<ShieldCheck className="w-5 h-5 text-purple-500" />}
            title="USDT Payouts"
            desc="Fast, secure crypto withdrawals."
          />
        </div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="sticky bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t z-50">
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>
            <Button size="lg" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold shadow-lg shadow-orange-500/20 text-base h-12 rounded-xl">
              Activate Partner Status
              <ChevronRight className="w-5 h-5 ml-1 opacity-80" />
            </Button>
          </DrawerTrigger>
          
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader className="text-left">
                <DrawerTitle className="text-2xl font-bold">Partner Agreement</DrawerTitle>
                <DrawerDescription className="mt-2 text-base">
                  By joining the Partner Program, you agree to:
                </DrawerDescription>
              </DrawerHeader>
              
              <div className="p-4 space-y-4">
                <ul className="space-y-3 text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>Promote ethically. No spam.</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>Payouts are settled in USDT (Polygon).</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>Self-referrals are not commissioned.</span>
                  </li>
                </ul>

                <Button 
                  onClick={handleJoin} 
                  disabled={isLoading}
                  className="w-full h-12 text-base font-semibold"
                >
                  {isLoading ? "Activating..." : "Agree & Generate My Link"}
                </Button>
                
                <DrawerClose asChild>
                  <Button variant="ghost" className="w-full text-muted-foreground">
                    Cancel
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
        <p className="text-[10px] text-center text-muted-foreground mt-3 pb-safe">
          Join 5,000+ creators earning today
        </p>
      </div>
    </div>
  );
}

function BenefitItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-xl bg-muted/40 border border-border/50">
      <div className="mt-1 p-2 bg-background rounded-full shadow-sm">
        {icon}
      </div>
      <div>
        <div className="font-bold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
