"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { VibeLogo } from "@/components/ui/vibe-logo";
import { Button } from "@/components/ui/button";
import { ShieldX, Trash2, Mail } from "lucide-react";

/**
 * Account Blocked Page
 * 
 * Shown when a user's account has been blocked or deleted.
 * - ?reason=deleted: User-requested account deletion
 * - ?reason=signup_disabled: New user sign-up is disabled
 * - No reason: Account suspended due to policy violations
 */
export default function BlockedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDeleted = searchParams.get("reason") === "deleted";
  const isSignupDisabled = searchParams.get("reason") === "signup_disabled";

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex max-w-md flex-col items-center gap-6 px-6 text-center">
        <VibeLogo size="lg" />
        
        <div className={`flex h-16 w-16 items-center justify-center rounded-full ${
          isDeleted || isSignupDisabled
            ? "bg-slate-100 dark:bg-slate-800" 
            : "bg-red-100 dark:bg-red-900/30"
        }`}>
          {isDeleted ? (
            <Trash2 className="h-8 w-8 text-slate-600 dark:text-slate-400" />
          ) : isSignupDisabled ? (
            <ShieldX className="h-8 w-8 text-slate-600 dark:text-slate-400" />
          ) : (
            <ShieldX className="h-8 w-8 text-red-600 dark:text-red-400" />
          )}
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isDeleted ? "Account Deleted" : isSignupDisabled ? "Sign Up Disabled" : "Account Suspended"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isDeleted
              ? "Your account has been deleted as requested. If you wish to use our service again, please create a new account."
              : isSignupDisabled
                ? "New user registration is temporarily disabled. If you already have an account, please sign in with the same email."
                : "Your account has been suspended due to a violation of our terms of service. If you believe this is a mistake, please contact our support team."
            }
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full">
          {!isDeleted && !isSignupDisabled && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.location.href = "mailto:support@example.com"}
            >
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          )}
          
          <Button
            variant={isDeleted ? "default" : "ghost"}
            className={isDeleted ? "w-full" : "w-full text-muted-foreground"}
            onClick={() => router.push("/")}
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
}

