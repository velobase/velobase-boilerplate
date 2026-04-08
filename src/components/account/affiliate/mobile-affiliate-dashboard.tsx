"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Coins,
  Copy,
  Crown,
  Wallet,
  ArrowRightLeft,
  Share2,
  User,
  History,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { WithdrawDrawer } from "./withdraw-drawer";
import { ExchangeDrawer } from "./exchange-drawer";
import { CommissionHistory } from "./commission-history";
import type { RouterOutputs } from "@/trpc/react";

export type AffiliateStatus = RouterOutputs["affiliate"]["getStatus"];

interface Props {
  status: AffiliateStatus;
}

export function MobileAffiliateDashboard({ status }: Props) {
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const availableUsd = (status.balances.availableCents / 100).toFixed(2);
  const pendingUsd = (status.balances.pendingCents / 100).toFixed(2);
  const minCashoutUsd = status.rules.minCashoutCents / 100;
  
  const progressPercent = Math.min(
    100,
    (status.balances.availableCents / status.rules.minCashoutCents) * 100
  );
  
  const isCashoutReady =
    status.balances.availableCents >= status.rules.minCashoutCents;

  const copyLink = () => {
    if (status.referralLink) {
      void navigator.clipboard.writeText(status.referralLink);
      toast.success("Link copied!");
    }
  };

  const shareText = encodeURIComponent(
    "Build with AI SaaS — join today!"
  );
  const shareUrl = encodeURIComponent(
    status.referralLink || "https://example.com"
  );
  
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
  const telegramShareUrl = `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;

  return (
    <>
    <div className="flex flex-col flex-1 px-4 pt-4 pb-8 space-y-6 relative animate-in fade-in duration-500">
        {/* Identity Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-500">
          <Crown className="w-5 h-5 fill-current" />
          <span className="font-bold text-lg tracking-tight">Partner Program</span>
        </div>
      </div>

        {/* Hero Status */}
      <div className="bg-primary/5 rounded-lg p-3 text-sm text-muted-foreground border border-primary/10">
          <span className="font-medium text-primary">Status: Active.</span> Share
          your link and earn 30% commission on every payment.
      </div>

        {/* Wallet Card */}
      <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/30 border-amber-500/20 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-32 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

          {/* Activity Button */}
          <div className="absolute top-3 right-3 z-20">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs bg-black/20 hover:bg-black/40 text-zinc-400 hover:text-white border border-white/5 rounded-full px-2.5 backdrop-blur-sm"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              Transactions
            </Button>
          </div>
        
        <CardContent className="pt-6 pb-6 space-y-6 relative z-10">
          {/* Main Balance */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5" />
                Wallet Balance
            </div>
            <div className="text-4xl font-bold text-white tracking-tight">
              ${availableUsd}
            </div>
              {status.balances.pendingCents > 0 && (
                <div className="text-sm font-medium text-amber-500 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                  <Clock className="w-3.5 h-3.5" />
                  ${pendingUsd} pending settlement
                </div>
              )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Withdrawal Progress</span>
              <span>${minCashoutUsd} Minimum</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  isCashoutReady ? "bg-green-500" : "bg-amber-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {!isCashoutReady && (
              <div className="text-xs text-amber-500/80 text-right">
                  $
                  {(
                    (status.rules.minCashoutCents -
                      status.balances.availableCents) /
                    100
                  ).toFixed(2)}{" "}
                  more to withdraw
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              className={cn(
                "w-full font-semibold", 
                isCashoutReady 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300"
              )}
                onClick={() => {
                  if (isCashoutReady) {
                    setWithdrawOpen(true);
                  } else {
                    const remaining = (status.rules.minCashoutCents - status.balances.availableCents) / 100;
                    toast.info(`You need $${minCashoutUsd} to withdraw.`, {
                      description: `Earn $${remaining.toFixed(2)} more to unlock cashout!`,
                      duration: 4000,
                    });
                  }
                }}
            >
                Withdraw
            </Button>
            <Button 
              variant="outline" 
              className="w-full bg-transparent border-zinc-700 text-zinc-300 hover:bg-white/5 hover:text-white px-2"
                onClick={() => setExchangeOpen(true)}
            >
              <Coins className="w-4 h-4 mr-1.5" />
                Get Credits
            </Button>
          </div>

            {/* Pending - REMOVED (moved to top) */}
        </CardContent>
      </Card>

        {/* Referral Link */}
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold">Your Referral Link</h2>
          <p className="text-sm text-muted-foreground">
              Earn <span className="text-amber-500 font-bold">30%</span> on every
              payment.
          </p>
        </div>

        <div className="flex gap-2 p-1.5 bg-muted/50 rounded-xl border">
          <div className="flex-1 flex items-center px-3 text-xs font-mono text-muted-foreground truncate select-all">
            {status.referralLink || "https://example.com?ref=..."}
          </div>
          <Button size="sm" onClick={copyLink} className="shrink-0">
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
        </div>

          {/* Social Share */}
        <div className="grid grid-cols-2 gap-3">
          <a 
            href={twitterShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-black text-white h-10 rounded-md font-medium text-sm hover:opacity-90 transition-opacity"
          >
              <XIcon className="w-4 h-4" />
            Post to X
          </a>
          <a 
            href={telegramShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#229ED9] text-white h-10 rounded-md font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <SendIcon className="w-4 h-4" />
              Share on TG
          </a>
        </div>
      </div>

        {/* How it works */}
      <div className="pt-6 border-t">
          <h3 className="text-sm font-medium mb-4 text-center text-muted-foreground">
            How it works
          </h3>
        <div className="flex justify-between items-start px-2">
            <StepIcon icon={<Share2 className="w-5 h-5" />} title="Share" desc="Your Link" />
          <div className="pt-3 text-muted-foreground/30">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
            <StepIcon icon={<User className="w-5 h-5" />} title="Refer" desc="New Users" />
          <div className="pt-3 text-muted-foreground/30">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
            <StepIcon icon={<Coins className="w-5 h-5" />} title="Earn" desc="30% Cash" />
        </div>
        
        <p className="text-xs text-center text-muted-foreground/60 mt-6 max-w-[280px] mx-auto">
            Crypto payments are instant. Card payments settle in 30 days.
        </p>
      </div>
    </div>

      {/* Drawers */}
      <WithdrawDrawer
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        availableCents={status.balances.availableCents}
        minCashoutCents={status.rules.minCashoutCents}
        defaultWallet={status.payoutWallet}
      />
      <ExchangeDrawer
        open={exchangeOpen}
        onOpenChange={setExchangeOpen}
        availableCents={status.balances.availableCents}
        exchangeUnitCents={status.rules.exchangeUnitCents}
        exchangeUnitCredits={status.rules.exchangeUnitCredits}
      />
      <CommissionHistory 
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  );
}

function StepIcon({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 w-20">
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-xs font-bold">{title}</div>
        <div className="text-[10px] text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
