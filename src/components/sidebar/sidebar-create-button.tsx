"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "./store/sidebar-store";

interface SidebarCreateButtonProps {
  onClick: () => void;
  className?: string;
}

export function SidebarCreateButton({ onClick, className }: SidebarCreateButtonProps) {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);

  return (
    <div className={cn("px-3 py-2", className)}>
      <Button
        onClick={onClick}
        variant="outline"
        size={isCollapsed ? "icon" : "default"}
        className={cn(
          "transition-all w-full",
          isCollapsed ? "h-10 w-10 mx-auto rounded-lg" : "justify-start h-10 rounded-lg"
        )}
      >
        <Plus className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
        {!isCollapsed && "New Chat"}
      </Button>
    </div>
  );
}
