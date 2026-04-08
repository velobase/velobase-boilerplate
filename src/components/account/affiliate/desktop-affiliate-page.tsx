"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Coins,
  Copy,
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
import { api, type RouterOutputs } from "@/trpc/react";
import { useRouter } from "next/navigation";
import { CommissionHistory } from "./commission-history";

interface Props {
  status: RouterOutputs["affiliate"]["getStatus"];
}

export function DesktopAffiliatePage({ status }: Props) {
  const router = useRouter();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const activateMutation = api.affiliate.activate.useMutation({
    onSuccess: () => {
      toast.success("Welcome to the partner program!");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to activate partner status");
    }
  });

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
    <div className="w-full max-w-4xl mx-auto pt-24 pb-12 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Partner Program</h1>
          <p className="text-muted-foreground">
            Share AI SaaS and earn 30% commission on every payment.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setHistoryOpen(true)}
          className="gap-2"
        >
          <History className="w-4 h-4" />
          Commission History
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Wallet & Balance */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/30 border-amber-500/20 shadow-xl overflow-hidden relative h-full">
            <div className="absolute top-0 right-0 p-48 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <CardContent className="p-8 space-y-8 relative z-10">
              {/* Main Balance */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Wallet Balance
                </div>
                <div className="text-5xl font-bold text-white tracking-tight">
                  ${availableUsd}
                </div>
                {status.balances.pendingCents > 0 && (
                  <div className="text-base font-medium text-amber-500 flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                    <Clock className="w-4 h-4" />
                    ${pendingUsd} pending settlement
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Withdrawal Progress</span>
                  <span>${minCashoutUsd} Minimum</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out",
                      isCashoutReady ? "bg-green-500" : "bg-amber-500"
                    )}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {!isCashoutReady && (
                  <div className="text-sm text-amber-500/80 text-right">
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
              <div className="grid grid-cols-2 gap-4">
                <Button
                  className={cn(
                    "w-full h-12 font-semibold text-lg",
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
                  Withdraw Cash
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 bg-transparent border-zinc-700 text-zinc-300 hover:bg-white/5 hover:text-white"
                  onClick={() => setExchangeOpen(true)}
                >
                  <Coins className="w-5 h-5 mr-2" />
                  Get Credits
                </Button>
            </div>

              {/* Pending - REMOVED (moved to top) */}
          </CardContent>
        </Card>
        </div>

        {/* Right Column: Link & Info */}
        <div className="space-y-6">
          {/* Referral Link Card */}
        <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Your Referral Link</h3>
                <p className="text-sm text-muted-foreground">
                  Share this link. Users who sign up via your link are permanently attributed to you.
                </p>
              </div>

              {!status.referralCode ? (
                <div className="p-6 bg-muted/30 rounded-xl border border-dashed flex flex-col items-center justify-center gap-4 text-center animate-in fade-in zoom-in-95 duration-300">
                  <p className="text-sm text-muted-foreground">
                    Activate your account to generate your unique referral link.
                  </p>
                  <Button
                    onClick={() => activateMutation.mutate()}
                    disabled={activateMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    {activateMutation.isPending
                      ? "Activating..."
                      : "Activate Partner Account"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 p-2 bg-muted/50 rounded-xl border">
                    <div className="flex-1 flex items-center px-3 font-mono text-sm text-muted-foreground truncate select-all">
                      {status.referralLink}
                    </div>
                    <Button onClick={copyLink} className="shrink-0">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <a
                      href={twitterShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-black text-white h-11 rounded-md font-medium text-sm hover:opacity-90 transition-opacity"
                    >
                      <XIcon className="w-4 h-4" />
                      Post to X
                    </a>
                    <a
                      href={telegramShareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-[#229ED9] text-white h-11 rounded-md font-medium text-sm hover:opacity-90 transition-opacity"
                    >
                      <SendIcon className="w-4 h-4" />
                      Share on TG
                    </a>
                  </div>
                </>
              )}
          </CardContent>
        </Card>

          {/* How it works */}
        <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-6">How it works</h3>
              <div className="flex justify-between items-center px-4">
                <StepIcon
                  icon={<Share2 className="w-6 h-6" />}
                  title="Share"
                  desc="Your Link"
                />
                <ArrowRightLeft className="w-5 h-5 text-muted-foreground/30" />
                <StepIcon
                  icon={<User className="w-6 h-6" />}
                  title="Refer"
                  desc="New Users"
                />
                <ArrowRightLeft className="w-5 h-5 text-muted-foreground/30" />
                <StepIcon
                  icon={<Coins className="w-6 h-6" />}
                  title="Earn"
                  desc="30% Cash"
                />
            </div>
              <p className="text-sm text-center text-muted-foreground/60 mt-8">
                Crypto payouts are processed manually within 24-48 hours.
                <br />
                Card payments settle in 30 days due to chargeback risks.
              </p>
          </CardContent>
        </Card>
        </div>
      </div>

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
    </div>
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
    <div className="flex flex-col items-center text-center gap-2">
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="font-bold">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
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
