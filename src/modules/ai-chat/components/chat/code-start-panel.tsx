"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github } from "lucide-react";
import { ChatInput, type AttachmentData } from "./chat-input";
import { useAgentStore } from "@/stores/agent-store";
import { useProjectFilterStore } from "@/stores/project-filter-store";
import { useConversation } from "@/modules/ai-chat/hooks/use-conversation";
import { api } from "@/trpc/react";

interface CodeStartPanelProps {
  agentId?: string;
  className?: string;
  isGuest?: boolean;
}

export function CodeStartPanel({
  agentId,
  className,
  isGuest = false,
}: CodeStartPanelProps) {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const { selectedUserAgentId } = useAgentStore();
  const { projectFilterId } = useProjectFilterStore();
  const { createConversation, isCreating } = useConversation();

  // Check GitHub connection status
  const { data: githubConnection } = api.github.getConnection.useQuery(
    undefined,
    { enabled: !isGuest }
  );
  const { data: authUrlData } = api.github.getAuthUrl.useQuery(
    undefined,
    { enabled: !isGuest && !githubConnection?.connected }
  );

  // Fetch connected repositories
  const { data: connectedRepos } = api.repository.list.useQuery(
    undefined,
    { enabled: !isGuest }
  );

  // Connect repository mutation
  const connectRepoMutation = api.repository.connect.useMutation();

  // Get recent repositories (limit to 3)
  const recentRepos = connectedRepos?.slice(0, 3) ?? [];

  // Handler for "Connect GitHub"
  const handleConnectGitHub = () => {
    if (authUrlData?.authUrl) {
      window.location.href = authUrlData.authUrl;
    }
  };

  // Handler for "Link repository"
  const handleLinkRepository = async () => {
    if (!repoUrl.trim()) {
      toast.error("Please enter a repository URL");
      return;
    }

    // Basic validation for GitHub URL
    const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
    if (!githubUrlPattern.test(repoUrl.trim())) {
      toast.error("Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)");
      return;
    }

    setIsConnecting(true);
    try {
      if (!isGuest && !selectedUserAgentId) {
        toast.error("Please select an agent before starting a conversation.");
        return;
      }

      // Connect the repository (stores in DB, creates project)
      const result = await connectRepoMutation.mutateAsync({
        url: repoUrl.trim(),
        createProject: true,
      });

      // Create conversation with repository metadata
      const metadata = isGuest ? undefined : { 
        userAgentId: selectedUserAgentId,
        repositoryId: result.id,
        repository: result.url,
      };
      
      const conversationId = await createConversation(
        isGuest, 
        result.projectId ?? projectFilterId ?? undefined, 
        metadata
      );
      
      const params = new URLSearchParams();
      params.set('prompt', `I've connected the repository: ${result.fullName}. How can I help you with this codebase?`);
      
      if (isGuest && agentId) {
        params.set('agentId', agentId);
      } else if (!isGuest && selectedUserAgentId) {
        params.set('userAgentId', selectedUserAgentId);
      }
      
      if (result.projectId) {
        params.set('project', result.projectId);
      }
      
      router.push(`/chat/${conversationId}?${params.toString()}`);
    } catch (error) {
      console.error('[CodeStartPanel] Repository connection failed:', error);
      
      // Extract and parse TRPC error message
      let errorMessage = "Failed to connect repository";
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      // Try to parse structured error message
      try {
        const errorData = JSON.parse(errorMessage) as {
          type?: string;
          organization?: string;
          message?: string;
        };
        
        if (errorData.type === 'org_restriction') {
          // Organization access restriction - access request sent
          toast.error(
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">🔒</span>
                <div className="flex-1">
                  <div className="font-semibold mb-1">Access Request Sent</div>
                  <div className="text-sm text-muted-foreground">
                    This repository belongs to the <strong>{errorData.organization ?? 'organization'}</strong> organization.
                  </div>
                </div>
              </div>
              
              <div className="text-sm bg-muted/50 rounded p-2 border-l-2 border-primary">
                ✓ We&apos;ve automatically sent an access request to the organization administrators.
              </div>
              
              <div className="text-xs text-muted-foreground">
                Once approved, you can retry connecting this repository.
              </div>
            </div>,
            { duration: 10000 }
          );
          return;
        }
        
        if (errorData.type === 'forbidden') {
          // Non-member or insufficient permissions
          toast.error(
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div className="flex-1">
                  <div className="font-semibold mb-1">Access Denied</div>
                  <div className="text-sm text-muted-foreground">
                    {errorData.message ?? 'Unable to access this repository'}
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                Please contact the <strong>{errorData.organization ?? 'organization'}</strong> organization owner to request access.
              </div>
            </div>,
            { duration: 8000 }
          );
          return;
        }
      } catch {
        // Not a structured error, fall through to simple message
      }
      
      // Show simple error message
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handler for "Just ask" - direct chat without repo
  const handleJustAsk = async (prompt: string, attachments?: AttachmentData[]) => {
    if (!prompt.trim() && (!attachments || attachments.length === 0)) return;

    if (attachments && attachments.length > 0) {
      toast.info("Attachments on the first message are not yet supported.");
      return;
    }

    if (isCreating) return;

    if (!isGuest && !selectedUserAgentId) {
      toast.error("Please select an agent before starting a conversation.");
      return;
    }

    try {
      const metadata = isGuest ? undefined : { userAgentId: selectedUserAgentId };
      const conversationId = await createConversation(isGuest, projectFilterId ?? undefined, metadata);
      
      const params = new URLSearchParams();
      params.set('prompt', prompt);
      
      if (isGuest && agentId) {
        params.set('agentId', agentId);
      } else if (!isGuest && selectedUserAgentId) {
        params.set('userAgentId', selectedUserAgentId);
      }
      
      if (projectFilterId) {
        params.set('project', projectFilterId);
      }
      
      router.push(`/chat/${conversationId}?${params.toString()}`);
    } catch (error) {
      toast.error("Failed to start a new conversation. Please try again.");
      console.error(error);
    }
  };

  return (
    <div className={cn("flex h-full flex-col items-center justify-center overflow-hidden p-8", className)}>
      {/* Welcome section */}
      <div className="flex-shrink-0 mb-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight mb-2">App Code</h2>
          <p className="text-muted-foreground">What will you build today?</p>
        </div>
      </div>

      {/* Main Chat Input */}
      <div className="w-full max-w-3xl mb-6">
        <ChatInput
          onSendMessage={(text, attachments) => {
            void handleJustAsk(text, attachments).catch((err: unknown) => {
              console.error("Failed to start conversation:", err);
            });
          }}
          onStopGeneration={undefined}
          disabled={isCreating || isConnecting}
          isGenerating={false}
          placeholder={
            isCreating
              ? "Starting conversation..."
              : "Ask me anything about code..."
          }
        />
      </div>

      {/* Separator */}
      <div className="relative w-full max-w-3xl mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground">or start with a repo</span>
        </div>
      </div>

      {/* Link Repository */}
      <div className="w-full max-w-3xl">
        {!isGuest && !githubConnection?.connected && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-dashed p-4">
            <div className="flex items-center gap-3">
              <Github className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Connect GitHub</div>
                <div className="text-xs text-muted-foreground">
                  Connect to access private repositories
                </div>
              </div>
            </div>
            <Button
              onClick={handleConnectGitHub}
              variant="outline"
              size="sm"
            >
              Connect
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isConnecting && !isCreating && repoUrl.trim()) {
                void handleLinkRepository();
              }
            }}
            disabled={isConnecting || isCreating}
            className="flex-1"
          />
          <Button
            onClick={handleLinkRepository}
            disabled={isConnecting || isCreating || !repoUrl.trim()}
            variant="secondary"
          >
            <Github className="h-4 w-4 mr-2" />
            {isConnecting ? "Connecting..." : "Link Repository"}
          </Button>
        </div>

        {/* Recent Repositories */}
        {!isGuest && recentRepos.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span>Recent:</span>
            {recentRepos.map((repo: { id: string; url: string; fullName: string }) => (
              <button
                key={repo.id}
                onClick={() => {
                  setRepoUrl(repo.url);
                }}
                disabled={isConnecting || isCreating}
                className="hover:text-foreground hover:underline disabled:opacity-50 transition-colors"
              >
                {repo.fullName}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

