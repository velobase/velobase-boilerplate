"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { SidebarIcon } from "./sidebar-icon";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "./store/sidebar-store";
import { Logo } from "@/components/ui/logo";

interface SidebarTopNavProps {
  hideCollapseButton?: boolean;
}

export function SidebarTopNav({ hideCollapseButton = false }: SidebarTopNavProps) {
  const { isCollapsed, isHovered, toggleCollapse } = useSidebarStore();

  return (
    <div className={cn(
      "flex items-center p-3 border-b border-border/40 shrink-0",
      isCollapsed ? "justify-center" : "justify-between"
    )}>
      {!isCollapsed && (
        <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
          <Logo size="sm" className="shrink-0 text-orange-500 group-hover:text-orange-600 transition-colors" />
          <span className="text-sm font-semibold truncate">App</span>
        </Link>
      )}
      
      {!hideCollapseButton && (
        <div className="relative h-10 w-10 shrink-0">
          {isCollapsed ? (
            <>
              {/* Logo link - default visible */}
              <Link
                href="/"
                className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-lg transition-opacity",
                  isHovered ? "opacity-0" : "opacity-100"
                )}
                aria-label="Go to home"
              >
                <Logo size="sm" className="text-orange-500 hover:text-orange-600 transition-colors" />
              </Link>
              {/* Collapse button - visible on hover */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className={cn(
                  "absolute inset-0 h-10 w-10 rounded-lg hover:bg-muted/50 transition-opacity",
                  isHovered ? "opacity-100" : "opacity-0"
                )}
                aria-label="Expand sidebar"
              >
                <SidebarIcon className="text-foreground" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapse}
              className="h-9 w-9 rounded-lg hover:bg-muted/50 transition-all"
              aria-label="Collapse sidebar"
            >
              <SidebarIcon className="text-muted-foreground" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
