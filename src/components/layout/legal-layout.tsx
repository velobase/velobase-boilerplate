"use client";

import { Header } from "@/components/layout/header";
import { SiteFooter } from "./site-footer";
import { Background } from "./background";

interface LegalLayoutProps {
  children: React.ReactNode;
  title: string;
  lastUpdated: string;
}

export function LegalLayout({ children, title, lastUpdated }: LegalLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans selection:bg-primary/30 relative flex flex-col">
      <Background />
      <Header />

      <main className="flex-1 relative z-10 w-full max-w-4xl mx-auto px-6 py-32">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            {title}
          </h1>
          <p className="text-muted-foreground text-sm">
            Last Updated: {lastUpdated}
          </p>
        </div>

        <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-p:text-muted-foreground prose-a:text-orange-500 hover:prose-a:text-orange-400 prose-strong:text-foreground prose-ul:text-muted-foreground">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

