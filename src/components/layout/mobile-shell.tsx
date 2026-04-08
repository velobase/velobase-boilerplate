"use client";

import { Header } from "@/components/layout/header";
import { Background } from "@/components/layout/background";
import { MobileNavBar } from "@/components/layout/mobile-nav";
import { useSession } from "next-auth/react";

export function MobileShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const showNavBar = !!session;

  return (
    <div className="h-dvh w-full bg-background text-foreground font-sans flex flex-col relative overflow-hidden">
      <Background />
      <Header className="bg-background/20 backdrop-blur-md border-b border-white/5" />
      <main
        className={`flex-1 flex flex-col relative z-10 pt-20 overflow-y-auto ${
          showNavBar ? "" : "pb-6"
        }`}
      >
        {children}
      </main>
      {showNavBar && (
        <div className="relative z-20">
          <MobileNavBar />
        </div>
      )}
    </div>
  );
}

