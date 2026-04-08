"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  CreditCard,
  Coins,
  Tag,
  User,
  Settings,
  FolderOpen,
  Store,
  Compass,
  ShieldCheck,
  FileText,
  BookOpen,
  HelpCircle,
  Users,
  Wallet,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Background } from "@/components/layout/background";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge?: string;
}

const mainFeatures: NavItem[] = [
  {
    title: "AI Chat",
    href: "/chat",
    icon: MessageSquare,
    description: "Multi-agent AI chat with tool use",
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderOpen,
    description: "Manage your projects and documents",
  },
  {
    title: "Marketplace",
    href: "/marketplace",
    icon: Store,
    description: "Browse and install AI agents",
  },
  {
    title: "Explorer",
    href: "/explorer",
    icon: Compass,
    description: "Explore community content",
  },
];

const accountPages: NavItem[] = [
  {
    title: "Profile",
    href: "/account/profile",
    icon: User,
    description: "Manage your profile",
  },
  {
    title: "Billing",
    href: "/account/billing",
    icon: CreditCard,
    description: "Subscription & payment history",
  },
  {
    title: "Credits",
    href: "/account/credits",
    icon: Coins,
    description: "View credit balance & usage",
  },
  {
    title: "Settings",
    href: "/account/settings",
    icon: Settings,
    description: "Account settings",
  },
  {
    title: "Affiliate",
    href: "/account/affiliate",
    icon: Users,
    description: "Referral program (30% commission)",
  },
];

const otherPages: NavItem[] = [
  {
    title: "Pricing",
    href: "/pricing",
    icon: Tag,
    description: "Plans and pricing",
  },
  {
    title: "Docs",
    href: "/docs",
    icon: BookOpen,
    description: "Documentation",
  },
  {
    title: "Support",
    href: "/support",
    icon: HelpCircle,
    description: "Get help",
  },
  {
    title: "Blog",
    href: "/blog",
    icon: FileText,
    description: "Latest news and updates",
  },
];

const adminPages: NavItem[] = [
  {
    title: "Admin Dashboard",
    href: "/admin",
    icon: ShieldCheck,
    description: "Users, orders, products, promos",
    badge: "Admin",
  },
];

function PageCard({ item }: { item: NavItem }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-start gap-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4",
        "hover:bg-accent/50 hover:border-border hover:shadow-md transition-all duration-200",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        <item.icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-foreground group-hover:text-foreground">
            {item.title}
          </h3>
          {item.badge && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
              {item.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
      </div>
    </Link>
  );
}

function PageSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => (
          <PageCard key={item.href} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isAdmin = (session.user as { isAdmin?: boolean })?.isAdmin ?? false;

  return (
    <div className="min-h-dvh w-full bg-background text-foreground font-sans relative overflow-x-hidden">
      <Background />
      <Header />

      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back{session.user.name ? `, ${session.user.name}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose where you want to go.
          </p>
        </div>

        <div className="space-y-8">
          <PageSection title="Core Features" items={mainFeatures} />
          <PageSection title="Account" items={accountPages} />
          <PageSection title="Resources" items={otherPages} />
          {isAdmin && <PageSection title="Administration" items={adminPages} />}
        </div>
      </main>
    </div>
  );
}
