"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Loader2, Minus, Plus, Coins } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";

interface ExchangeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCents: number;
  exchangeUnitCents: number;
  exchangeUnitCredits: number;
}

export function ExchangeDrawer({
  open,
  onOpenChange,
  availableCents,
  exchangeUnitCents,
  exchangeUnitCredits,
}: ExchangeDrawerProps) {
  const utils = api.useUtils();
  const [units, setUnits] = useState(1);

  const maxUnits = Math.floor(availableCents / exchangeUnitCents);
  const totalCents = units * exchangeUnitCents;
  const totalCredits = units * exchangeUnitCredits;

  const exchangeMutation = api.affiliate.exchangeCredits.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.creditsGranted.toLocaleString()} credits added!`);
      onOpenChange(false);
      setUnits(1);
      void utils.affiliate.getStatus.invalidate();
      void utils.account.getBillingStatus.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Exchange failed");
    },
  });

  const handleConfirm = () => {
    exchangeMutation.mutate({ units });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUnits(1);
    }
    onOpenChange(newOpen);
  };

  const increment = () => setUnits((u) => Math.min(u + 1, maxUnits));
  const decrement = () => setUnits((u) => Math.max(u - 1, 1));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setUnits(1);
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setUnits(Math.min(Math.max(1, num), maxUnits || 1));
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            Exchange for Credits
          </DrawerTitle>
          <DrawerDescription>
            Convert your earnings to video generation credits
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-2 space-y-4">
          {/* Unit selector */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={decrement}
              disabled={units <= 1}
              className="h-10 w-10 rounded-full"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <Input
                type="number"
                min={1}
                max={maxUnits || 1}
                value={units}
                onChange={handleInputChange}
                className="w-24 h-12 text-3xl font-bold text-center border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="text-xs text-muted-foreground mt-1">
                max: {maxUnits}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={increment}
              disabled={units >= maxUnits}
              className="h-10 w-10 rounded-full"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Exchange summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">You spend</span>
              <span className="font-semibold text-red-500">
                -${(totalCents / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">You get</span>
              <span className="font-semibold text-green-500">
                +{totalCredits.toLocaleString()} credits
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Rate</span>
                <span>
                  ${(exchangeUnitCents / 100).toFixed(0)} = {exchangeUnitCredits.toLocaleString()} credits
                </span>
              </div>
            </div>
          </div>

          {maxUnits === 0 && (
            <p className="text-xs text-amber-500 text-center">
              You need at least ${(exchangeUnitCents / 100).toFixed(0)} to exchange
            </p>
          )}
        </div>
        <DrawerFooter>
          <Button
            onClick={handleConfirm}
            disabled={exchangeMutation.isPending || maxUnits === 0}
          >
            {exchangeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exchanging...
              </>
            ) : (
              `Get ${totalCredits.toLocaleString()} Credits`
            )}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

