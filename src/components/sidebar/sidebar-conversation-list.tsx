"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Plus } from "lucide-react";
import { useSidebarStore } from "./store/sidebar-store";
import { Button } from "@/components/ui/button";

interface SidebarConversationListProps {
  children: React.ReactNode;
  isEmpty?: boolean;
  onCreateNew?: () => void;
}

export function SidebarConversationList({
  children,
  isEmpty,
  onCreateNew,
}: SidebarConversationListProps) {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);

  if (isCollapsed) {
    return (
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="py-2 space-y-2">
            {isEmpty ? (
              <div className="flex justify-center px-2">
                <div 
                  className="h-10 w-10 rounded-lg border border-dashed border-muted-foreground/30 flex items-center justify-center"
                  title="No conversations"
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground/40" />
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="space-y-1 p-2">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="mb-3 p-2.5 rounded-lg bg-muted/30">
                <MessageSquare className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <h4 className="text-sm font-medium text-foreground mb-1">
                No conversations yet
              </h4>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Create a new conversation to get started
              </p>
              {onCreateNew && (
                <Button
                  onClick={onCreateNew}
                  size="sm"
                  variant="outline"
                  className="h-9 px-4 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              )}
            </div>
          ) : (
            children
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
