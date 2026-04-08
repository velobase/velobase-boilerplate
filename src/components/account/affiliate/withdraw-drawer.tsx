"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";

interface WithdrawDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCents: number;
  minCashoutCents: number;
  defaultWallet: string | null;
}

export function WithdrawDrawer({
  open,
  onOpenChange,
  availableCents,
  minCashoutCents,
  defaultWallet,
}: WithdrawDrawerProps) {
  const utils = api.useUtils();
  const [wallet, setWallet] = useState(defaultWallet ?? "");
  const [step, setStep] = useState<"input" | "confirm">("input");

  const availableUsd = (availableCents / 100).toFixed(2);
  const minUsd = (minCashoutCents / 100).toFixed(0);
  const canWithdraw = availableCents >= minCashoutCents;

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(wallet.trim());

  const cashoutMutation = api.affiliate.requestCashout.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal request submitted");
      onOpenChange(false);
      setStep("input");
      void utils.affiliate.getStatus.invalidate();
    },
    onError: (err) => {
      if (err.message === "Cashout request already exists") {
        toast.error("You already have a pending withdrawal request");
      } else {
        toast.error(err.message || "Failed to submit request");
      }
    },
  });

  const handleNext = () => {
    if (!isValidAddress) {
      toast.error("Invalid wallet address");
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = () => {
    cashoutMutation.mutate({
      amountCents: availableCents,
      walletAddress: wallet.trim(),
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep("input");
      setWallet(defaultWallet ?? "");
    }
    onOpenChange(newOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        {step === "input" ? (
          <>
            <DrawerHeader>
              <DrawerTitle>Withdraw to USDT</DrawerTitle>
              <DrawerDescription>
                Enter your Polygon wallet address
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wallet">Wallet Address (Polygon)</Label>
                <Input
                  id="wallet"
                  placeholder="0x..."
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  className="font-mono text-sm"
                />
                {wallet && !isValidAddress && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Invalid EVM address format
                  </p>
                )}
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-semibold">${availableUsd}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Minimum</span>
                  <span>${minUsd}</span>
                </div>
              </div>
              {!canWithdraw && (
                <p className="text-xs text-amber-500 text-center">
                  You need at least ${minUsd} to withdraw
                </p>
              )}
            </div>
            <DrawerFooter>
              <Button
                onClick={handleNext}
                disabled={!isValidAddress || !canWithdraw}
              >
                Continue
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        ) : (
          <>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Confirm Withdrawal
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2 space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Amount</div>
                  <div className="text-2xl font-bold">${availableUsd} USDT</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">To Address</div>
                  <div className="font-mono text-xs break-all">{wallet}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Payouts are processed manually within 24-48 hours.
              </p>
            </div>
            <DrawerFooter>
              <Button
                onClick={handleConfirm}
                disabled={cashoutMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {cashoutMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Confirm Withdrawal"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep("input")}
                disabled={cashoutMutation.isPending}
              >
                Back
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

