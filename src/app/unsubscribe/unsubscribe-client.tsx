"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useAuthStore } from "@/components/auth/store/auth-store";
import { useSession } from "next-auth/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileShell } from "@/components/layout/mobile-shell";
import { DesktopShell } from "@/components/layout/desktop-shell";

export function UnsubscribeClient() {
  const isMobile = useIsMobile();
  const Shell = isMobile ? MobileShell : DesktopShell;

  return (
    <Shell>
      <div className="flex-1 flex flex-col justify-center">
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
          <UnsubscribeContent />
        </Suspense>
      </div>
    </Shell>
  );
}

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || null; 
  
  // Auth
  const { setLoginModalOpen } = useAuthStore();
  const { data: session } = useSession();

  // State
  const [preferences, setPreferences] = useState<{
    marketing: boolean;
    product: boolean;
    newsletter: boolean;
    billing: boolean;
  }>({
    marketing: true,
    product: true,
    newsletter: true,
    billing: true,
  });

  const [isSaved, setIsSaved] = useState(false);

  // Queries
  const { data, isLoading, error, refetch } = api.notification.getPreferencesByToken.useQuery(
    { token },
    { 
      retry: false,
      enabled: !!token || !!session?.user,
    }
  );

  const updateMutation = api.notification.updatePreferencesByToken.useMutation({
    onSuccess: () => {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    },
  });

  useEffect(() => {
    if (data) {
      setPreferences(data);
    }
  }, [data]);

  useEffect(() => {
    if (session?.user) {
      void refetch();
    }
  }, [session, refetch]);

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error State
  if (error) {
    const isUnauthorized = error.data?.code === "UNAUTHORIZED" || error.data?.code === "NOT_FOUND";
    
    return (
      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-none sm:border sm:shadow-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle>
              {isUnauthorized ? "Sign in Required" : "Something went wrong"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground px-4">
            <p className="mb-6 text-sm sm:text-base">
              {isUnauthorized 
                ? "The unsubscribe link is invalid or expired. Please sign in to manage your preferences."
                : "We couldn't load your preferences. Please try again later."
              }
            </p>
            <Button className="w-full sm:w-auto" onClick={() => setLoginModalOpen(true, window.location.href, "url")}>
              Sign in to Manage Preferences
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = () => {
    updateMutation.mutate({
      token,
      marketing: preferences.marketing,
      product: preferences.product,
      newsletter: preferences.newsletter,
    });
  };

  const handleUnsubscribeAll = () => {
    setPreferences(prev => ({ ...prev, marketing: false, product: false, newsletter: false }));
    updateMutation.mutate({
      token,
      marketing: false,
      product: false,
      newsletter: false,
    });
  };

  return (
    <div className="bg-background sm:bg-muted/30 w-full sm:flex sm:items-center sm:justify-center p-0 sm:p-4 min-h-full">
      <Card className="w-full max-w-lg shadow-none border-none sm:shadow-lg sm:border h-full sm:h-auto flex flex-col">
        <CardHeader className="text-center border-b bg-muted/10 pb-6 pt-8 sm:pt-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Email Preferences</CardTitle>
          <p className="text-muted-foreground mt-2 text-sm px-4">
            Manage which emails you receive from AI SaaS
          </p>
        </CardHeader>

        <CardContent className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
          <div className="space-y-3">
            <OptionItem 
              id="marketing"
              label="Marketing & Promotions"
              desc="Receive special offers, discounts, and seasonal gifts."
              checked={preferences.marketing}
              onChange={(c) => setPreferences(p => ({ ...p, marketing: c }))}
            />

            <OptionItem 
              id="product"
              label="Product Updates"
              desc="Stay informed about new features and improvements."
              checked={preferences.product}
              onChange={(c) => setPreferences(p => ({ ...p, product: c }))}
            />

            <OptionItem 
              id="newsletter"
              label="Weekly Newsletter"
              desc="Curated content, tips, and community highlights."
              checked={preferences.newsletter}
              onChange={(c) => setPreferences(p => ({ ...p, newsletter: c }))}
            />

            <div className="flex items-start space-x-3 p-3 rounded-lg opacity-60 bg-muted/30">
              <Checkbox id="billing" checked disabled className="mt-1" />
              <div className="grid gap-1.5 leading-none">
                <label className="text-sm font-medium leading-none cursor-not-allowed">
                  Billing Alerts
                </label>
                <p className="text-xs text-muted-foreground leading-snug">
                  Invoices, payment receipts, and subscription notices (Required).
                </p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t bg-muted/10 p-4 sm:p-6 mt-auto sm:mt-0">
          <div className="flex flex-col-reverse sm:flex-row w-full gap-3">
            <Button 
              variant="outline" 
              className="w-full sm:flex-1 text-muted-foreground hover:text-destructive hover:border-destructive/30 h-11 sm:h-10"
              onClick={handleUnsubscribeAll}
              disabled={updateMutation.isPending}
            >
              Unsubscribe All
            </Button>
            <Button 
              className="w-full sm:flex-1 h-11 sm:h-10 font-semibold" 
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isSaved ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs text-center text-muted-foreground px-4">
            Changes may take up to 24 hours to fully propagate.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

function OptionItem({ id, label, desc, checked, onChange }: { 
  id: string, label: string, desc: string, checked: boolean, onChange: (c: boolean) => void 
}) {
  return (
    <div 
      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 active:bg-muted/70 transition-colors cursor-pointer select-none"
      onClick={() => onChange(!checked)}
    >
      <Checkbox 
        id={id} 
        checked={checked}
        onCheckedChange={(c) => onChange(!!c)}
        className="mt-1"
        onClick={(e) => e.stopPropagation()} 
      />
      <div className="grid gap-1.5 leading-none">
        <label
          htmlFor={id}
          className="text-sm font-medium leading-none cursor-pointer"
        >
          {label}
        </label>
        <p className="text-xs text-muted-foreground leading-snug">
          {desc}
        </p>
      </div>
    </div>
  );
}
