"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logout } from "@/lib/logout";
import { api } from "@/trpc/react";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string | null;
}

const CONFIRMATION_ITEMS = [
  {
    id: "data",
    label: "I understand that deleting my account will remove all associated data.",
  },
  {
    id: "media",
    label: "I understand that deleting my account will delete all my images/videos and other media.",
  },
  {
    id: "subscription",
    label: "I understand that deleting my account does not automatically cancel paid subscriptions and no refunds will be issued. I have manually cancelled all paid subscriptions.",
  },
  {
    id: "email",
    label: "I understand I cannot use the same email to sign up a new account.",
  },
  {
    id: "irreversible",
    label: "I understand that this action cannot be undone.",
  },
] as const;

type ConfirmationId = typeof CONFIRMATION_ITEMS[number]["id"];

export function DeleteAccountDialog({
  open,
  onOpenChange,
  userEmail,
}: DeleteAccountDialogProps) {
  const [confirmations, setConfirmations] = useState<Record<ConfirmationId, boolean>>({
    data: false,
    media: false,
    subscription: false,
    email: false,
    irreversible: false,
  });
  const router = useRouter();

  const deleteAccountMutation = api.account.deleteAccount.useMutation({
    onSuccess: async () => {
      toast.success("Account deleted successfully");
      await logout({ source: "profile" });
      router.push("/");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete account. Please contact support.");
    },
  });

  const allConfirmed = CONFIRMATION_ITEMS.every((item) => confirmations[item.id]);

  const handleToggle = (id: ConfirmationId, checked: boolean) => {
    setConfirmations((prev) => ({ ...prev, [id]: checked }));
  };

  const handleDelete = async () => {
    if (!allConfirmed) return;
    deleteAccountMutation.mutate();
  };

  const handleClose = () => {
    if (!deleteAccountMutation.isPending) {
      setConfirmations({
        data: false,
        media: false,
        subscription: false,
        email: false,
        irreversible: false,
      });
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">
              Confirm account deletion
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-left">
              <p className="text-sm text-muted-foreground">
                Please check each item to continue (all items are required):
              </p>
              {userEmail && (
                <p className="text-sm">
                  Account: <span className="font-mono font-medium">{userEmail}</span>
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {CONFIRMATION_ITEMS.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <Checkbox
                id={`confirm-${item.id}`}
                checked={confirmations[item.id]}
                onCheckedChange={(checked) => handleToggle(item.id, checked === true)}
                disabled={deleteAccountMutation.isPending}
                className="mt-0.5"
              />
              <Label
                htmlFor={`confirm-${item.id}`}
                className="text-sm font-normal leading-snug cursor-pointer"
              >
                {item.label}
              </Label>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={deleteAccountMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!allConfirmed || deleteAccountMutation.isPending}
          >
            {deleteAccountMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Account"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
