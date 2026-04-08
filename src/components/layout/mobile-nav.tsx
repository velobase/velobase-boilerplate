"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Sparkles, History, User, HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/analytics";
import { NAVIGATION_EVENTS, type MobileTab } from "@/analytics/events/navigation";
import { api } from "@/trpc/react";
import { useSession } from "next-auth/react";

export function MobileNavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const tabEnterTimeRef = useRef<number>(Date.now());
  const prevTabRef = useRef<MobileTab | null>(null);

  // Check affiliate eligibility
  const { data: affiliateStatus } = api.affiliate.getStatus.useQuery(undefined, {
    enabled: !!session,
    staleTime: 60000, // cache for 1 minute
  });
  const isEligible = affiliateStatus?.eligible ?? false;

  const current: MobileTab =
    pathname.startsWith("/chat") ? "chat" :
    pathname.startsWith("/history") ? "history" :
    pathname.startsWith("/account/affiliate") ? "profile" : // map affiliate to profile slot for now
    pathname.startsWith("/profile") ? "profile" :
    "create";

  // 追踪 tab 停留时间
  useEffect(() => {
    // 进入新 tab 时记录时间
    tabEnterTimeRef.current = Date.now();

    return () => {
      // 离开时上报停留时长
      const duration = Math.round((Date.now() - tabEnterTimeRef.current) / 1000);
      track(NAVIGATION_EVENTS.MOBILE_TAB_LEAVE, {
        tab: current,
        duration_seconds: duration,
      });
    };
  }, [current]);

  const handleTabClick = (tab: MobileTab) => {
    if (tab !== current) {
      track(NAVIGATION_EVENTS.MOBILE_TAB_CLICK, {
        tab,
        from_tab: current,
      });
      prevTabRef.current = current;
    }
  };

  return (
    <nav className="w-full bg-background/80 backdrop-blur-xl border-t pb-safe">
      <div className="flex items-center justify-around h-16">
        <NavButton
          href="/"
          active={current === "create"}
          icon={Sparkles}
          label="Create"
          onClick={() => handleTabClick("create")}
        />
        {/* AI Chat 暂时隐藏
        <NavButton
          href="/chat"
          active={current === "chat"}
          icon={MessageCircle}
          label="AI"
          onClick={() => handleTabClick("chat")}
        />
        */}
        <NavButton
          href="/history"
          active={current === "history"}
          icon={History}
          label="History"
          onClick={() => handleTabClick("history")}
        />
        <NavButton
          href={isEligible ? "/account/affiliate" : "/profile"}
          active={current === "profile"}
          icon={isEligible ? HandCoins : User}
          label={isEligible ? "Referrals" : "Profile"}
          badge={isEligible ? "30%" : undefined}
          onClick={() => handleTabClick("profile")}
        />
      </div>
    </nav>
  );
}

function NavButton({
  href,
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  href: string;
  active: boolean;
  icon: React.ElementType;
  label: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 duration-200",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="relative">
        <Icon className={cn("w-6 h-6", active && "fill-current/20")} />
        {badge && (
          <span className="absolute -top-1.5 -right-2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold leading-none text-primary-foreground">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}
