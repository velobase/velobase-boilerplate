"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Settings, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

const navItems: NavItem[] = [
  {
    label: "Profile",
    href: "/account/profile",
    icon: User,
    description: "Manage your public profile",
  },
  {
    label: "Settings",
    href: "/account/settings",
    icon: Settings,
    description: "Configure preferences",
  },
  {
    label: "Billing",
    href: "/account/billing",
    icon: CreditCard,
    description: "Subscription & credits",
  },
];

interface AccountPageLayoutProps {
  children: React.ReactNode;
}

export function AccountPageLayout({ children }: AccountPageLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex h-full w-full">
      {/* Left Navigation Sidebar (Inset) */}
      <nav className="w-60 bg-transparent flex-shrink-0" aria-label="Account navigation">
        <div className="sticky top-0 py-8 px-3">
          <div className="mb-8 px-3">
            <h2 className="text-lg font-semibold tracking-tight leading-tight">Account</h2>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Manage your account settings</p>
          </div>
          
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`${item.label} - ${item.description}`}
                  className={cn(
                    "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    "hover:bg-accent/60 hover:text-foreground h-[44px]",
                    isActive && "bg-accent/50 text-foreground",
                    !isActive && "text-muted-foreground"
                  )}
                >
                  {/* Active indicator bar - 2px */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-primary rounded-r-full" />
                  )}
                  
                  <Icon className="h-4 w-4 shrink-0 ml-0.5" strokeWidth={2} />
                  <span className="flex-1 text-left leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

