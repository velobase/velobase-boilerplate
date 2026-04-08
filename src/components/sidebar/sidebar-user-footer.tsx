"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  LogOut,
  Settings,
  User,
  CreditCard,
  MoreHorizontal,
  Sparkles,
  Sun,
  Moon,
  Monitor
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "./store/sidebar-store";
import { api } from "@/trpc/react";
import { logout } from "@/lib/logout";

export function SidebarUserFooter() {
  const { data: session } = useSession();
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  
  // 获取用户订阅等级信息
  const { data: billingStatus } = api.account.getBillingStatus.useQuery(undefined, {
    enabled: !!session?.user,
  });

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!session?.user) {
    return null;
  }

  const userInitial = session.user.name?.[0]?.toUpperCase() || "U";
  const tier = billingStatus?.tier || "FREE";
  const isPro = tier === "PLUS";

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className="border-t border-border/50 p-3 mt-auto">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2.5 h-auto py-2 px-2 rounded-lg transition-colors hover:bg-muted/70",
              isCollapsed && "justify-center p-2"
            )}
            aria-label="打开用户菜单"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={session.user.image || undefined} />
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <>
                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <span className="text-sm font-medium line-clamp-1">
                    {session.user.name}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {session.user.email}
                  </span>
                  <Badge 
                    variant={isPro ? "default" : "secondary"}
                    className={cn(
                      "mt-1 h-5 text-[10px] px-1.5",
                      isPro && "bg-gradient-to-r from-purple-500 to-pink-500 border-0"
                    )}
                  >
                    {isPro && <Sparkles className="h-3 w-3" />}
                    {isPro ? "Pro" : "Free"}
                  </Badge>
                </div>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align={isCollapsed ? "center" : "end"} 
          side="top"
          className="w-64"
        >
          {/* 用户信息头部 */}
          <div className="px-3 py-2.5 bg-muted/30 rounded-t-md">
            <p className="text-sm font-medium line-clamp-1">{session.user.name}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{session.user.email}</p>
            <Badge 
              variant={isPro ? "default" : "secondary"}
              className={cn(
                "mt-1.5 h-5 text-[10px] px-1.5",
                isPro && "bg-gradient-to-r from-purple-500 to-pink-500 border-0"
              )}
            >
              {isPro && <Sparkles className="h-3 w-3" />}
              {isPro ? "Pro" : "Free"}
            </Badge>
          </div>
          <DropdownMenuSeparator />
          
          {/* Theme Switcher */}
          {mounted && (
            <>
              <div className="px-3 py-2.5">
                <p className="text-xs font-medium text-muted-foreground mb-2">Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex flex-col gap-1 h-auto py-2",
                      theme === "light" && "border-primary"
                    )}
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-4 w-4" />
                    <span className="text-xs">Light</span>
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex flex-col gap-1 h-auto py-2",
                      theme === "dark" && "border-primary"
                    )}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-4 w-4" />
                    <span className="text-xs">Dark</span>
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex flex-col gap-1 h-auto py-2",
                      theme === "system" && "border-primary"
                    )}
                    onClick={() => setTheme("system")}
                  >
                    <Monitor className="h-4 w-4" />
                    <span className="text-xs">System</span>
                  </Button>
                </div>
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* 核心操作组 */}
          <DropdownMenuItem onSelect={() => handleNavigation("/account/profile")}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleNavigation("/account/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleNavigation("/account/billing")}>
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* 退出操作 */}
          <DropdownMenuItem
            onSelect={() => void logout({ callbackUrl: "/", source: "sidebar" })}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
