"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileShell } from "@/components/layout/mobile-shell";
import { DesktopShell } from "@/components/layout/desktop-shell";
import { MobileAffiliatePage } from "@/components/account/affiliate/mobile-affiliate-page";
import { DesktopAffiliatePage } from "@/components/account/affiliate/desktop-affiliate-page";
import { api } from "@/trpc/react";

export default function AffiliateRoute() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/api/auth/signin?callbackUrl=%2Faccount%2Faffiliate");
    }
  }, [sessionStatus, router]);

  const { data: affiliateStatus, isLoading } = api.affiliate.getStatus.useQuery(undefined, {
    enabled: !!session,
  });

  // Loading state
  if (!mounted || sessionStatus === "loading" || isLoading) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  // Not eligible - 404
  if (!affiliateStatus?.eligible) {
    router.push("/404");
    return null;
  }

  if (isMobile) {
    return (
      <MobileShell>
        <MobileAffiliatePage status={affiliateStatus} />
      </MobileShell>
    );
  }

  return (
    <DesktopShell>
      <div className="container mx-auto px-4 py-8">
        <DesktopAffiliatePage status={affiliateStatus} />
      </div>
    </DesktopShell>
  );
}
