"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/components/auth/store/auth-store";
import { LoginModal } from "@/components/auth/login-modal";
import { Logo } from "@/components/ui/logo";
import { useTranslations } from "next-intl";

function SignInContent() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { setLoginModalOpen } = useAuthStore();

  useEffect(() => {
    if (status === "authenticated" && session) {
      const callbackUrl = searchParams.get("callbackUrl") ?? "/";
      router.push(callbackUrl);
      return;
    }

    if (status === "unauthenticated") {
      const callbackUrl = searchParams.get("callbackUrl") ?? "/";
      setLoginModalOpen(true, callbackUrl, "url");
    }
  }, [status, session, searchParams, setLoginModalOpen, router]);

  const loadingMessage =
    status === "authenticated"
      ? t("redirecting")
      : status === "loading"
        ? t("checkingAuth")
        : t("loadingSignIn");

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-6">
        <Logo size="xl" className="text-orange-500" />
        <p className="text-sm text-muted-foreground">{loadingMessage}</p>
      </div>
      <LoginModal />
    </div>
  );
}

export default function SignInPage() {
  const t = useTranslations("auth");

  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <Logo size="xl" className="text-orange-500" />
          <p className="text-sm text-muted-foreground">{t("checkingAuth")}</p>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
