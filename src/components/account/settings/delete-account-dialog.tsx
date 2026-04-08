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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logout } from "@/lib/logout";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string | null;
}

/**
 * Delete Account Dialog Component
 * Provides a safe, multi-step confirmation process for account deletion
 */
export function DeleteAccountDialog({ 
  open, 
  onOpenChange,
  userEmail 
}: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  
  const CONFIRM_TEXT = "DELETE";
  const isConfirmed = confirmText === CONFIRM_TEXT;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    try {
      // TODO: Implement actual account deletion API
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      toast.success("Account deleted successfully");
      
      // Sign out and redirect
      await logout({ source: "settings" });
      router.push("/");
    } catch {
      toast.error("Failed to delete account. Please contact support.");
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText("");
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">
              Delete Account
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 text-left">
            <p className="font-medium text-foreground">
              This action cannot be undone. This will permanently delete your account.
            </p>
            <p>
              All your data will be permanently removed, including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All conversations and chat history</li>
              <li>Credits and subscriptions</li>
              <li>Account settings and preferences</li>
            </ul>
            <p className="font-medium text-foreground pt-2">
              Account: <span className="font-mono text-sm">{userEmail}</span>
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          <Label htmlFor="confirm-delete">
            Type <span className="font-mono font-bold">{CONFIRM_TEXT}</span> to confirm
          </Label>
          <Input
            id="confirm-delete"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            disabled={isDeleting}
            autoComplete="off"
            className="font-mono"
          />
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? (
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
