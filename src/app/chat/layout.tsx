"use client";

// Register custom tool renderers (must be client-side)
import "@/modules/ai-chat/setup-renderers";

import { useIsMobile } from "@/hooks/use-mobile";
import { MobileShell } from "@/components/layout/mobile-shell";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileShell>{children}</MobileShell>;
  }

  // Desktop: render children directly (they handle their own layout)
  return <>{children}</>;
}
