"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { MobileShell } from "@/components/layout/mobile-shell";
import { DesktopShell } from "@/components/layout/desktop-shell";
import { ProfilePage } from "@/components/profile/profile-page";
import { useEffect, useState } from "react";

export default function ProfileRoute() {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  if (isMobile) {
    return (
      <MobileShell>
        <ProfilePage />
      </MobileShell>
    );
  }

  // Desktop version - use same component for now
  return (
    <DesktopShell>
      <div className="container mx-auto px-4 py-8">
        <ProfilePage />
      </div>
    </DesktopShell>
  );
}
