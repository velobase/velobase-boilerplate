"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CompletePayoutDialog(props: {
  requestId: string;
  type: "CASHOUT_USDT" | "EXCHANGE_CREDITS";
  defaultTxHash?: string | null;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [txHash, setTxHash] = useState(props.defaultTxHash ?? "");
  const [adminNote, setAdminNote] = useState("");

  const mutation = api.admin.updateAffiliatePayoutRequest.useMutation({
    onSuccess: () => {
      toast.success("Updated");
      setOpen(false);
      props.onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    mutation.mutate({
      id: props.requestId,
      action: "COMPLETE",
      txHash: txHash || undefined,
      adminNote: adminNote || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Complete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete payout</DialogTitle>
          <DialogDescription>Mark request as COMPLETED and record tx hash.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="txHash">txHash {props.type === "CASHOUT_USDT" ? "(required)" : "(optional)"}</Label>
            <Input
              id="txHash"
              placeholder="0x..."
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adminNote">Admin note (optional)</Label>
            <Input
              id="adminNote"
              placeholder="Note"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



