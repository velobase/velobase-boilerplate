'use client';

import { Suspense } from 'react';
import { api } from '@/trpc/react';
import { Header } from '@/components/layout/header';
import { SiteFooter } from '@/components/layout/site-footer';
import { Background } from '@/components/layout/background';
import { CreditsPackageCard } from '@/components/pricing/credits-package-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/components/auth/store/auth-store';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function CreditsPageContent() {
  const { setLoginModalOpen } = useAuthStore();

  const { data: creditsData, isLoading: creditsLoading } = api.product.listForPricing.useQuery({
    type: 'CREDITS_PACKAGE',
    limit: 20,
  });

  const creditsPackages = creditsData?.products ?? [];

  return (
    <div className="min-h-screen w-full bg-background text-foreground relative">
      <Background />
      <Header />

      <main className="relative z-10 flex flex-col items-center w-full px-4 pt-24 pb-12">
        <div className="w-full max-w-4xl">
            {/* Back Button */}
            <div className="mb-6">
              <Button variant="ghost" size="sm" asChild>
              <Link href="/account/billing" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-4 w-4" />
                Back
                </Link>
              </Button>
            </div>

            {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight">Buy Credits</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Purchase credits for video generation
              </p>
            </div>

            {/* Credits Packages Grid */}
            {creditsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[320px] rounded-xl" />
                ))}
              </div>
            ) : creditsPackages.length === 0 ? (
              <div className="text-center py-12 border border-border/50 rounded-xl bg-card/80 backdrop-blur-sm">
                <p className="text-muted-foreground">
                  No credits packages available
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {creditsPackages.map((product) => (
                  <CreditsPackageCard
                    key={product.id}
                    product={product}
                    onRequireLogin={() => setLoginModalOpen(true, undefined, "header")}
                  />
                ))}
              </div>
            )}

            {/* Info Section */}
          <div className="mt-10 p-6 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
            <h3 className="text-base font-semibold mb-3">About Credits</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Credits never expire</li>
              <li>• Use for AI video generation</li>
              <li>• Flexible pay-as-you-go</li>
              </ul>
            </div>
          </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export default function CreditsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full bg-background" />}>
      <CreditsPageContent />
    </Suspense>
  );
}
