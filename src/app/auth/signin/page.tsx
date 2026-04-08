"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/components/auth/store/auth-store";
import { LoginModal } from "@/components/auth/login-modal";
import { Logo } from "@/components/ui/logo";

/**
 * Custom Sign In Page Content
 */
function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { setLoginModalOpen } = useAuthStore();
  
  useEffect(() => {
    // If already logged in, redirect to callback URL or home
    if (status === "authenticated" && session) {
      const callbackUrl = searchParams.get("callbackUrl") ?? "/";
      router.push(callbackUrl);
      return;
    }

    // If not logged in, open the login modal
    if (status === "unauthenticated") {
      const callbackUrl = searchParams.get("callbackUrl") ?? "/";
      setLoginModalOpen(true, callbackUrl, "url");
    }
  }, [status, session, searchParams, setLoginModalOpen, router]);

  // Show different loading messages based on auth status
  const loadingMessage = status === "authenticated" 
    ? "Redirecting..." 
    : status === "loading"
    ? "Checking authentication..."
    : "Loading sign in options...";

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

/**
 * Custom Sign In Page
 * Replaces the default NextAuth sign-in page with our branded login modal
 * 
 * Behavior:
 * - If user is already logged in → redirect to callback URL or home
 * - If user is not logged in → show login modal
 */
export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-6">
          <Logo size="xl" className="text-orange-500" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}

