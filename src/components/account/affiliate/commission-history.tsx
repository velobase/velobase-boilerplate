"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Info, CheckCircle2, Clock, XCircle, Wallet, CreditCard, Bitcoin } from "lucide-react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface CommissionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommissionHistory({ open, onOpenChange }: CommissionHistoryProps) {
  const isMobile = useIsMobile();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = 
    api.affiliate.listCommissions.useInfiniteQuery(
      { limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: open,
      }
    );

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      {!isLoading && items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12 text-center text-muted-foreground">
          <Wallet className="w-12 h-12 mb-4 opacity-20" />
          <p>No commissions yet.</p>
          <p className="text-xs">Share your link to start earning!</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              items.map((item) => (
                <HistoryItem key={item.id} item={item} />
              ))
            )}
            
            {hasNextPage && (
              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-2" />
                ) : null}
                Load more
              </Button>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Commission History</DrawerTitle>
            <DrawerDescription>
              Track your earnings and pending settlements
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 flex-1 overflow-hidden">{content}</div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Commission History</DialogTitle>
          <DialogDescription>
            Track your earnings and pending settlements
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-[300px]">{content}</div>
      </DialogContent>
    </Dialog>
  );
}

type CommissionItem = RouterOutputs["affiliate"]["listCommissions"]["items"][number];

function HistoryItem({ item }: { item: CommissionItem }) {
  const amountUsd = (item.commissionCents / 100).toFixed(2);
  const grossUsd = (item.grossAmountCents / 100).toFixed(2);
  const rate = (item.commissionRateBps / 100).toFixed(0);
  
  const isRenewal = item.sourceType === "SUBSCRIPTION_RENEWAL";
  const isCrypto = item.paymentGateway === "NOWPAYMENTS";
  
  const date = new Date(item.createdAt);
  const availableAt = new Date(item.availableAt);
  
  // Obfuscate email: johndoe@gmail.com -> j***@gmail.com
  const email = item.referredUser?.email;
  const displayName = email 
    ? email.replace(/(^.).*(@.*$)/, "$1***$2")
    : "Unknown User";

  const statusConfig = {
    PENDING: { 
      icon: Clock, 
      color: "text-amber-500", 
      bg: "bg-amber-500/10",
      label: "Pending" 
    },
    AVAILABLE: { 
      icon: CheckCircle2, 
      color: "text-green-500", 
      bg: "bg-green-500/10",
      label: "Available" 
    },
    VOIDED: { 
      icon: XCircle, 
      color: "text-red-500", 
      bg: "bg-red-500/10",
      label: "Voided" 
    },
  }[item.state as string] || { icon: Info, color: "text-zinc-500", bg: "bg-zinc-500/10", label: item.state };

  const StatusIcon = statusConfig.icon;
  const TypeIcon = isCrypto ? Bitcoin : CreditCard;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors">
      <div className={cn("p-2 rounded-full shrink-0", isRenewal ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500")}>
        <TypeIcon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium text-sm truncate flex items-center gap-1.5">
              {isRenewal ? "Renewal" : "Purchase"}
              <span className="text-muted-foreground font-normal">from</span>
              <span className="font-mono text-xs">{displayName}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {format(date, "MMM d, yyyy")} • {rate}% of ${grossUsd}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-sm text-green-500">
              +${amountUsd}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <Badge variant="secondary" className={cn("text-[10px] h-5 px-1.5 font-medium gap-1", statusConfig.color, statusConfig.bg)}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
          
          {item.state === "PENDING" && (
            <span className="text-[10px] text-muted-foreground">
              Unlocks {format(availableAt, "MMM d")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

