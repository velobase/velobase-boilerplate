"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SidebarContainer,
  SidebarTopNav,
  SidebarCreateButton,
  SidebarConversationList,
  SidebarConversationItem,
  SidebarConversationSkeleton,
  SidebarUserFooter,
  SidebarProjectsLink,
} from "./sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogIn, X, Filter } from "lucide-react";
import { GUEST_MODE_COPY } from "@/config/guest-mode";
import { useAuthStore } from "@/components/auth/store/auth-store";
import { useAgentStore } from "@/stores/agent-store";
import { useProjectFilterStore } from "@/stores/project-filter-store";

interface ConversationSidebarProps {
  className?: string;
  isGuest?: boolean;
}

export function ConversationSidebar({ className, isGuest = false }: ConversationSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentConversationId = pathname.startsWith('/chat/') && pathname !== '/chat' 
    ? pathname.split('/')[2] 
    : null;
  const { data: session } = useSession();
  const { setLoginModalOpen } = useAuthStore();
  
  // Project filter state (from store, not URL)
  const { projectFilterId, setProjectFilterId, clearProjectFilter } = useProjectFilterStore();
  
  // URL is the source of truth - always sync from URL to Store
  useEffect(() => {
    const projectFromUrl = searchParams.get('project');

    // Always keep store in sync with URL
    if (projectFromUrl !== projectFilterId) {
      setProjectFilterId(projectFromUrl);
    }
  }, [searchParams, projectFilterId, setProjectFilterId]);
  
  // Defensive check: ensure isGuest is true when there's no session
  const effectiveIsGuest = isGuest || !session;
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  const utils = api.useUtils();

  // Agent Store (kept for future extensibility, but UI does not expose switching)
  const { setUserAgents } = useAgentStore();

  // Fetch user agents once to hydrate store (used implicitly by StartPanel)
  const { data: fetchedUserAgents } = api.userAgent.listWithDetails.useQuery(undefined, {
    enabled: !effectiveIsGuest,
    staleTime: Infinity, // Cache forever, refetch manually if needed
  });

  useEffect(() => {
    if (fetchedUserAgents) {
      setUserAgents(fetchedUserAgents);
    }
  }, [fetchedUserAgents, setUserAgents]);
  
  // Get ALL conversations (no server-side filtering by project)
  const { data: allConversations = [], isLoading } = api.conversation.list.useQuery(
    { 
      limit: 50, 
      archived: false,
      // Don't filter by projectId on server - we'll filter client-side
    },
    { enabled: !effectiveIsGuest }
  );

  // Client-side filtering by project (instant, no refetch)
  const conversations = useMemo(() => {
    if (!projectFilterId) return allConversations;
    return allConversations.filter(conv => conv.projectId === projectFilterId);
  }, [allConversations, projectFilterId]);

  // Get filtered project info
  // Prefer deriving from conversations; if not found (e.g., project has no conversations yet), fetch by id
  const derivedProject = useMemo(() => {
    if (!projectFilterId) return null;
    const convWithProject = allConversations.find(conv => conv.projectId === projectFilterId);
    return convWithProject?.project ?? null;
  }, [allConversations, projectFilterId]);

  const { data: fetchedProject } = api.project.get.useQuery(
    { id: projectFilterId! },
    {
      enabled: !!projectFilterId && !derivedProject,
      staleTime: 5 * 60 * 1000,
    }
  );

  const filteredProject = derivedProject ?? fetchedProject ?? null;

  // Update title mutation
  const updateTitleMutation = api.conversation.updateTitle.useMutation({
    onSuccess: () => {
      void utils.conversation.list.invalidate();
      toast.success("Conversation renamed");
    },
    onError: () => {
      toast.error("Failed to rename conversation");
    },
  });

  // Delete mutation
  const deleteMutation = api.conversation.delete.useMutation({
    onSuccess: () => {
      void utils.conversation.list.invalidate();
      
      // If deleting current conversation, go to new chat
      if (conversationToDelete === currentConversationId) {
        router.push("/");
      }
      
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
      toast.success("Conversation deleted");
    },
    onError: () => {
      toast.error("Failed to delete conversation");
    },
  });

  // Archive mutation
  const archiveMutation = api.conversation.archive.useMutation({
    onSuccess: () => {
      void utils.conversation.list.invalidate();
      toast.success("Conversation archived");
    },
    onError: () => {
      toast.error("Failed to archive conversation");
    },
  });

  // Unarchive mutation
  const unarchiveMutation = api.conversation.unarchive.useMutation({
    onSuccess: () => {
      void utils.conversation.list.invalidate();
      toast.success("Conversation restored");
    },
    onError: () => {
      toast.error("Failed to restore conversation");
    },
  });

  const handleNewChat = () => {
    // Preserve project filter in URL if active
    if (projectFilterId) {
      router.push(`/chat?project=${projectFilterId}`);
    } else {
      router.push('/chat');
    }
  };

  const handleSelectConversation = (id: string) => {
    // Preserve project filter in URL if active
    if (projectFilterId) {
      router.push(`/chat/${id}?project=${projectFilterId}`);
    } else {
      router.push(`/chat/${id}`);
    }
  };

  const handleClearProjectFilter = () => {
    // Clear store and remove from URL
    clearProjectFilter();
    // Remove project param from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete('project');
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const handleDeleteConversation = (id: string) => {
    setConversationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    updateTitleMutation.mutate({ conversationId: id, title: newTitle });
  };

  const handleArchiveConversation = (id: string) => {
    archiveMutation.mutate({ conversationId: id });
  };

  const handleUnarchiveConversation = (id: string) => {
    unarchiveMutation.mutate({ conversationId: id });
  };

  const confirmDelete = () => {
    if (conversationToDelete) {
      deleteMutation.mutate({ conversationId: conversationToDelete });
    }
  };

  // Guest mode sidebar
  if (effectiveIsGuest) {
    return (
        <SidebarContainer className={className}>
        <SidebarTopNav />
        <SidebarCreateButton onClick={handleNewChat} />
        
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-3 p-2.5 rounded-lg bg-primary/10">
            <LogIn className="h-5 w-5 text-primary" />
          </div>
          <h4 className="text-sm font-medium text-foreground mb-1">
            {GUEST_MODE_COPY.SIDEBAR_TITLE}
          </h4>
          <p className="text-xs text-muted-foreground mb-4 max-w-[200px] leading-relaxed">
            {GUEST_MODE_COPY.SIDEBAR_DESCRIPTION}
          </p>
          <Button
            onClick={() => setLoginModalOpen(true, '/')}
            variant="outline"
            size="sm"
            className="h-9 px-4 gap-2"
          >
            <LogIn className="h-4 w-4" />
            {GUEST_MODE_COPY.SIDEBAR_CTA}
          </Button>
        </div>
      </SidebarContainer>
    );
  }

  return (
    <>
        <SidebarContainer className={className}>
        <SidebarTopNav />
        <SidebarCreateButton onClick={handleNewChat} />
        
        {/* Projects Navigation */}
        <div className="px-3 pb-2">
          <SidebarProjectsLink />
        </div>

        <Separator className="mx-3 my-2" />
        
        {/* Project Filter Banner */}
        {projectFilterId && (
          <div className="mx-3 mb-2 px-3 py-2 rounded-md bg-muted/50 border border-border/50">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {filteredProject?.name ?? "Loading project..."}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearProjectFilter}
                className="h-6 w-6 p-0 flex-shrink-0"
                aria-label="Clear filter"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
        
        <SidebarConversationList 
          isEmpty={conversations.length === 0 && !isLoading}
          onCreateNew={handleNewChat}
        >
          {isLoading ? (
            <SidebarConversationSkeleton count={8} />
          ) : (
            conversations.map((conversation) => (
              <SidebarConversationItem
                key={conversation.id}
                title={conversation.title ?? "Untitled Chat"}
                isActive={conversation.id === currentConversationId}
                isArchived={conversation.isArchived}
                project={conversation.project}
                onClick={() => handleSelectConversation(conversation.id)}
                onDelete={() => handleDeleteConversation(conversation.id)}
                onRename={(newTitle) => handleRenameConversation(conversation.id, newTitle)}
                onArchive={() => handleArchiveConversation(conversation.id)}
                onUnarchive={() => handleUnarchiveConversation(conversation.id)}
              />
            ))
          )}
        </SidebarConversationList>

        {session && <SidebarUserFooter />}
      </SidebarContainer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
