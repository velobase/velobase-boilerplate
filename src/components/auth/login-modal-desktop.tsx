"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLogin } from "./use-login";
import { LoginContent } from "./login-content";

export function LoginModalDesktop() {
  const { loginModalOpen, isSigninPage, handleModalClose } = useLogin();

  return (
    <Dialog open={loginModalOpen} onOpenChange={handleModalClose}>
      <DialogContent 
        className="sm:max-w-[420px] p-0 gap-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950"
        onInteractOutside={(e) => { if (isSigninPage) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (isSigninPage) e.preventDefault(); }}
      >
        <LoginContent 
          TitleComponent={DialogTitle}
          DescriptionComponent={DialogDescription}
        />
      </DialogContent>
    </Dialog>
  );
}

