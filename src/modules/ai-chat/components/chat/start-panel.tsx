"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChatInput, type AttachmentData } from "./chat-input";
import { WelcomeView } from "./welcome-view";
import { CodeStartPanel } from "./code-start-panel";
import { useAgentStore } from "@/stores/agent-store";
import { useProjectFilterStore } from "@/stores/project-filter-store";
import { useConversation } from "@/modules/ai-chat/hooks/use-conversation";

interface StartPanelProps {
  // agentId is still needed for guest mode where there's no user or userAgent
  agentId?: string; 
  className?: string;
  isGuest?: boolean;
}

export function StartPanel({
  agentId,
  className,
  isGuest = false,
}: StartPanelProps) {
  const router = useRouter();
  
  // Use the global agent store to get the selected user agent
  const { selectedUserAgentId, getSelectedUserAgent } = useAgentStore();
  
  // Get current agent info to determine which panel to show
  const selectedUserAgent = getSelectedUserAgent();
  const currentAgentId = isGuest ? agentId : selectedUserAgent?.agent?.id;
  
  // Get current project filter from store
  const { projectFilterId } = useProjectFilterStore();

  // Use conversation hook for consistent creation logic
  const { createConversation, isCreating } = useConversation();

  const handleStartConversation = async (
    prompt: string,
    attachments?: AttachmentData[]
  ) => {
    if (!prompt.trim() && (!attachments || attachments.length === 0)) return;

    if (attachments && attachments.length > 0) {
      toast.info("Attachments on the first message are not yet supported.");
      return;
    }

    if (isCreating) return;

    // For logged-in users, ensure an agent is selected.
    if (!isGuest && !selectedUserAgentId) {
      toast.error("Please select an agent before starting a conversation.");
      return;
    }

    try {
      // Create conversation using the hook
      const metadata = isGuest ? undefined : { userAgentId: selectedUserAgentId };
      const conversationId = await createConversation(isGuest, projectFilterId ?? undefined, metadata);
      
      const params = new URLSearchParams();
      params.set('prompt', prompt);
      
      // Pass agentId for guest or userAgentId for logged-in users to the chat page
      if (isGuest && agentId) {
        params.set('agentId', agentId);
      } else if (!isGuest && selectedUserAgentId) {
        params.set('userAgentId', selectedUserAgentId);
      }
      
      // Preserve project filter in URL if present
      if (projectFilterId) {
        params.set('project', projectFilterId);
      }
      
      router.push(`/chat/${conversationId}?${params.toString()}`);
    } catch (error) {
      toast.error("Failed to start a new conversation. Please try again.");
      console.error(error);
    }
  };

  // Show specialized panel for App Code
  if (currentAgentId === 'agent_coding_assistant') {
    return (
      <CodeStartPanel
        agentId={agentId}
        className={className}
        isGuest={isGuest}
      />
    );
  }

  // Default panel for other agents
  return (
    <div className={cn("flex h-full flex-col items-center justify-center overflow-hidden p-8", className)}>
      {/* Welcome section - centered */}
      <div className="flex-shrink-0 mb-8">
        <WelcomeView />
      </div>

      {/* Input section - centered */}
      <div className="w-full max-w-3xl">
        <ChatInput
          onSendMessage={(text, attachments) => {
            void handleStartConversation(text, attachments).catch((err: unknown) => {
              console.error("Failed to start conversation:", err);
            });
          }}
          onStopGeneration={undefined}
          disabled={isCreating}
          isGenerating={false}
          placeholder={
            isCreating
              ? "Starting conversation..."
              : "Message App..."
          }
        />
      </div>
    </div>
  );
}
