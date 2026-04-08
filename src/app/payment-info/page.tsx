"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";

/**
 * Card setup is temporarily disabled.
 * Credit card payments are handled via Telegram Stars.
 */
export default function PaymentInfoPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to billing after a short delay.
    const t = setTimeout(() => {
      router.replace("/account/billing");
    }, 800);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      <Header />
      <main className="flex-1 container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Payment method setup is unavailable</h1>
          <p className="text-sm text-muted-foreground">
            We currently don&apos;t support saving cards. Credit card payments are handled via Telegram.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild>
              <Link href="/pricing">Go to Pricing</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/account/settings">Account Settings</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
