"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "./store/sidebar-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SidebarProjectsLink() {
  const router = useRouter();
  const pathname = usePathname();
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  
  const isActive = pathname === "/projects";

  const handleClick = () => {
    router.push("/projects");
  };

  // Collapsed view - icon with tooltip
  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg cursor-pointer mx-auto",
                "transition-colors hover:bg-muted/70",
                isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
              )}
              onClick={handleClick}
            >
              <Folder className="h-4 w-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Projects</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Normal view - consistent with conversation items
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2.5 transition-all cursor-pointer",
        "hover:bg-muted/70",
        isActive ? "bg-muted shadow-sm" : "bg-transparent"
      )}
      onClick={handleClick}
    >
      <Folder className="h-4 w-4 shrink-0" />
      <span className="text-sm font-normal leading-tight">Projects</span>
    </div>
  );
}

