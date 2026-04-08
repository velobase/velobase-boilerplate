"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSidebarStore } from "./store/sidebar-store";

interface SidebarConversationSkeletonProps {
  count?: number;
}

export function SidebarConversationSkeleton({ count = 5 }: SidebarConversationSkeletonProps) {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);

  if (isCollapsed) {
    return (
      <div className="space-y-2 py-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex justify-center">
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-lg">
          <Skeleton className="h-4 flex-1 rounded" />
          <Skeleton className="h-4 w-4 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

