"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  MoreHorizontal, 
  Trash2, 
  Edit2,
  Check,
  X,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "./store/sidebar-store";

interface SidebarConversationItemProps {
  title: string;
  isActive: boolean;
  isArchived?: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  project?: {
    id: string;
    name: string;
  } | null;
}

export function SidebarConversationItem({
  title,
  isActive,
  isArchived = false,
  onClick,
  onDelete,
  onRename,
  onArchive,
  onUnarchive,
  project,
}: SidebarConversationItemProps) {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== title) {
      onRename(editTitle);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(title);
    setIsEditing(false);
  };

  // Collapsed view - just show first letter
  if (isCollapsed) {
    return (
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg cursor-pointer mx-auto",
          "transition-colors hover:bg-muted/70",
          isActive ? "bg-primary/10 text-primary" : "bg-muted/30 hover:bg-muted/50"
        )}
        onClick={onClick}
        title={title}
      >
        <span className="text-xs font-semibold">
          {title.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveEdit();
            if (e.key === "Escape") handleCancelEdit();
          }}
          className="h-9 text-sm"
          autoFocus
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={handleSaveEdit}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={handleCancelEdit}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Normal view
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-all cursor-pointer",
        "hover:bg-muted/70",
        isActive ? "bg-muted shadow-sm" : "bg-transparent"
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-normal line-clamp-1 leading-tight">{title}</p>
        {project && (
          <p className="text-xs text-muted-foreground line-clamp-1 leading-tight mt-0.5">
            {project.name}
          </p>
        )}
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          {isArchived ? (
            onUnarchive && (
              <DropdownMenuItem onClick={onUnarchive}>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Unarchive
              </DropdownMenuItem>
            )
          ) : (
            onArchive && (
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )
          )}
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
