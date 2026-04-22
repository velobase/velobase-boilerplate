"use client";

// Register custom tool renderers (must be client-side)
import "@/modules/ai-chat/setup-renderers";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
