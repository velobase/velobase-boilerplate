"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "./store/sidebar-store";

interface SidebarContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function SidebarContainer({ children, className }: SidebarContainerProps) {
  const { isCollapsed, setIsHovered } = useSidebarStore();

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border/40 bg-card transition-all duration-300 ease-out shrink-0",
        isCollapsed ? "w-14" : "w-64",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
}
