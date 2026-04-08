"use client";

import { Header } from "@/components/layout/header";
import { Background } from "@/components/layout/background";

export function DesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh w-full bg-background text-foreground font-sans flex flex-col relative overflow-x-hidden">
      <Background />
      <Header />
      <main className="flex-1 flex flex-col relative z-10">
        {children}
      </main>
    </div>
  );
}

