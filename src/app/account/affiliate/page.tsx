"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MobileAffiliatePage } from "@/components/account/affiliate/mobile-affiliate-page";
import { DesktopAffiliatePage } from "@/components/account/affiliate/desktop-affiliate-page";
import { useIsMobile } from "@/hooks/use-mobile";
import { api } from "@/trpc/react";

export default function AffiliateRoute() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/api/auth/signin?callbackUrl=%2Faccount%2Faffiliate");
    }
  }, [sessionStatus, router]);

  const { data: affiliateStatus, isLoading } = api.affiliate.getStatus.useQuery(undefined, {
    enabled: !!session,
  });

  if (!mounted || sessionStatus === "loading" || isLoading) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  if (!affiliateStatus?.eligible) {
    router.push("/404");
    return null;
  }

  if (isMobile) {
    return <MobileAffiliatePage status={affiliateStatus} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <DesktopAffiliatePage status={affiliateStatus} />
    </div>
  );
}
