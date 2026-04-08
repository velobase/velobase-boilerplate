"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { ScrollableMessageList, type ScrollableMessageListHandle } from "./scrollable-message-list";
import { SharedConversationBanner } from "./shared-conversation-banner";
import { ErrorMessage } from "./error-message";
import { EmptyConversationView } from "./empty-conversation-view";
import { MessageListSkeleton } from "./message-list-skeleton";
import type { ChatUIMessage } from "../../types/message";
import { useConversation } from "../../hooks/use-conversation";
import { ChatInput, type AttachmentData } from "./chat-input";
import { api as trpcApi } from "@/trpc/react";
import { toast } from "sonner";
import { GUEST_MODE_COPY, GUEST_MODE_CONFIG } from "@/config/guest-mode";
import { useAuthStore } from "@/components/auth/store/auth-store";
import { useAgentStore } from "@/stores/agent-store";
import { useProjectFilterStore } from "@/stores/project-filter-store";
import { useSession } from "next-auth/react";

/**
 * File part for messages (Vercel AI SDK standard)
 */
export interface FilePart {
  type: 'file';
  url: string;
  filename?: string;
  mediaType: string;
}

interface ChatPanelProps {
  userAgentId?: string;
  agentId?: string;
  className?: string;
  isGuest?: boolean;
  conversationId?: string;
}

/**
 * Chat Panel - Simple version
 */
export function ChatPanel({
  className,
  isGuest = false,
  conversationId: propsId,
}: ChatPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const utils = trpcApi.useUtils();
  const [atBottom, setAtBottom] = useState(true);
  const messageListRef = useRef<ScrollableMessageListHandle>(null);
  const [hasReceivedFirstReply, setHasReceivedFirstReply] = useState(false);
  const { setLoginModalOpen: setLoginModalOpenFromStore } = useAuthStore();
  const { selectedUserAgentId } = useAgentStore();
  const { data: session } = useSession();
  
  // Rename for clarity in this component
  const setLoginModalOpen = setLoginModalOpenFromStore;

  // For the first message in a new chat, the agent/userAgent ID comes from the URL
  const initialAgentId = searchParams.get('agentId');
  const initialUserAgentId = searchParams.get('userAgentId');
  
  // Get current project filter from store
  const { projectFilterId } = useProjectFilterStore();

  // Persist effective IDs across URL cleanup and re-renders
  const userAgentIdRef = useRef<string | undefined>(initialUserAgentId ?? selectedUserAgentId ?? undefined);
  const agentIdRef = useRef<string | undefined>(isGuest ? (initialAgentId ?? undefined) : undefined);

  useEffect(() => {
    if (!isGuest) {
      if (!userAgentIdRef.current && (initialUserAgentId || selectedUserAgentId)) {
        userAgentIdRef.current = initialUserAgentId ?? selectedUserAgentId ?? undefined;
      }
    } else {
      if (!agentIdRef.current && initialAgentId) {
        agentIdRef.current = initialAgentId;
      }
    }
  }, [isGuest, initialUserAgentId, selectedUserAgentId, initialAgentId]);
  
  // Simple conversation management
  const { id: conversationId, createConversation, isCreating } = useConversation(propsId);
  
  // Guest ID for rate limiting
  const getOrCreateGuestId = (): string => {
    if (typeof window === 'undefined') return '';
    
    const STORAGE_KEY = 'app_guest_id';
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored) {
      return stored;
    }
    
    // Generate new guest ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 11);
    const guestId = `guest_${timestamp}_${random}`;
    
    localStorage.setItem(STORAGE_KEY, guestId);
    return guestId;
  };
  
  const guestId = isGuest ? getOrCreateGuestId() : undefined;
  
  // Load conversation messages
  const { data: conversationData, isLoading: isLoadingMessages, refetch: refetchConversation } = trpcApi.conversation.get.useQuery(
    { conversationId: conversationId! },
    { 
      enabled: !!conversationId,
      refetchOnMount: false, // 避免标签页切换时重新加载，打断流式输出
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1分钟缓存，减少不必要的重新获取
    }
  );
  
  const loadedMessages = conversationData?.messages;
  
  // Check if viewing shared conversation
  const isOwner = !isGuest && conversationData?.userId === session?.user?.id;
  const isViewingShared = conversationData?.isShared && !isOwner;
  const isReadOnly = isViewingShared || (conversationData?.isGuest && !isGuest);

  // Use chat hook
  const { messages: chatMessages, status, sendMessage: sendMessageRaw, stop, error, clearError, setMessages: setChatMessages, regenerate } = useChat({
    id: conversationId ?? 'placeholder',
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest({ id, messages, trigger, messageId, body }) {
        const userAgentIdForRequest = isGuest ? undefined : (userAgentIdRef.current ?? selectedUserAgentId ?? initialUserAgentId);
        const agentIdForRequest = isGuest ? (agentIdRef.current ?? initialAgentId) : undefined;

        // 返回完整的请求体（包含 SDK 默认字段 + 认证字段）
        return {
          body: {
            id,
            trigger,
            ...(messageId && { messageId }),
            ...(trigger === 'submit-message' && { message: messages[messages.length - 1] }),
            ...(body ?? {}),
            ...(isGuest && agentIdForRequest && { agentId: agentIdForRequest }),
            ...(isGuest && guestId && { guestId }),
            ...(!isGuest && userAgentIdForRequest && { userAgentId: userAgentIdForRequest }),
          },
        };
      },
    }),
    onFinish: ({ message }) => {
      // Track first reply for guest mode
      if (isGuest && message.role === 'assistant' && !hasReceivedFirstReply) {
        setHasReceivedFirstReply(true);
        
        // Show toast CTA
        toast(GUEST_MODE_COPY.TOAST_TITLE, {
          description: GUEST_MODE_COPY.TOAST_DESCRIPTION(),
          action: {
            label: GUEST_MODE_COPY.TOAST_CTA,
            onClick: () => {
              setLoginModalOpen(true, '/', 'generate_gate');
            },
          },
          duration: GUEST_MODE_CONFIG.TOAST_DURATION,
        });
      }

      // After an assistant message finishes, refetch projection to enrich with variants
      if (conversationId) {
        void refetchConversation();
        
        // Refresh conversation list to update title (generated by backend)
        void utils.conversation.list.invalidate();
      }
    },
    onError: (error) => {
      // Handle rate limit errors for guests
      if (isGuest && error.message) {
        const errorMsg = error.message.toLowerCase();
        
        if (errorMsg.includes('rate_limit') || errorMsg.includes('daily message limit')) {
          toast.error('Daily message limit reached', {
            description: 'Sign in to continue chatting with unlimited messages.',
            action: {
              label: 'Sign In',
              onClick: () => setLoginModalOpen(true, '/', 'generate_gate'),
            },
            duration: 10000,
          });
          return;
        }
        
        if (errorMsg.includes('conversation_limit') || errorMsg.includes('guest conversation limit')) {
          toast.error('Free trial limit reached', {
            description: 'Sign in to continue this conversation.',
            action: {
              label: 'Sign In',
              onClick: () => setLoginModalOpen(true, '/', 'generate_gate'),
            },
            duration: 10000,
          });
          return;
        }
      }
      
      // Default error handling
      console.error('Chat error:', error);
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";
  
  // Set loaded messages when they become available
  // 重要：保护流式输出，避免在流式传输时覆盖消息
  useEffect(() => {
    if (loadedMessages && Array.isArray(loadedMessages) && loadedMessages.length > 0) {
      // 如果正在流式输出，不覆盖当前消息，保持流式输出继续
      if (isStreaming) {
        return;
      }
      
      // 只在消息数量不同或首次加载时才更新
      // 这样可以避免不必要的重新渲染
      if (chatMessages.length !== loadedMessages.length || chatMessages.length === 0) {
        setChatMessages(loadedMessages);
      }
    }
  }, [loadedMessages, setChatMessages, isStreaming, chatMessages.length]);
  
  // Handle regenerate using SDK's built-in function
  const handleRegenerate = useCallback((interactionId: string) => {
    if (isStreaming) return;
    
    // Use SDK's regenerate with custom body for auth context
    const userAgentIdForRequest = isGuest ? undefined : (userAgentIdRef.current ?? selectedUserAgentId ?? initialUserAgentId);
    const agentIdForRequest = isGuest ? (agentIdRef.current ?? initialAgentId) : undefined;
    
    void regenerate({
      messageId: interactionId,
      body: {
        // Auth context
        ...(isGuest && agentIdForRequest && { agentId: agentIdForRequest }),
        ...(isGuest && guestId && { guestId }),
        ...(!isGuest && userAgentIdForRequest && { userAgentId: userAgentIdForRequest }),
      },
    });
  }, [isStreaming, isGuest, selectedUserAgentId, initialUserAgentId, initialAgentId, guestId, regenerate]);
  
  // Handle edit using SDK's sendMessage with messageId
  const handleEdit = useCallback((messageId: string, newContent: string) => {
    if (isStreaming) return;
    
    void sendMessageRaw({
      text: newContent,
      messageId,
    });
  }, [isStreaming, sendMessageRaw]);
  
  // Handle initial prompt from query params
  useEffect(() => {
    const initialPrompt = searchParams.get('prompt');
    if (initialPrompt && chatMessages.length === 0 && conversationId) {
      // Persist the effective IDs before URL cleanup
      if (!isGuest) {
        userAgentIdRef.current = userAgentIdRef.current ?? initialUserAgentId ?? selectedUserAgentId ?? undefined;
      } else {
        agentIdRef.current = agentIdRef.current ?? initialAgentId ?? undefined;
      }

      // Guard against duplicate auto-send caused by StrictMode double mount
      if (typeof window !== 'undefined') {
        const key = `chat_initial_sent:${conversationId}`;
        const alreadySentPrompt = sessionStorage.getItem(key);
        if (alreadySentPrompt === initialPrompt) {
          // Clean URL but preserve project filter
          const cleanUrl = projectFilterId ? `/chat/${conversationId}?project=${projectFilterId}` : `/chat/${conversationId}`;
          router.replace(cleanUrl, { scroll: false });
          return;
        }
        sessionStorage.setItem(key, initialPrompt);
      }

      void sendMessageRaw({ parts: [{ type: 'text', text: initialPrompt }] });
      // Clean URL but preserve project filter
      const cleanUrl = projectFilterId ? `/chat/${conversationId}?project=${projectFilterId}` : `/chat/${conversationId}`;
      router.replace(cleanUrl, { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);
  
  // Handle new chat
  const handleNewChat = useCallback(() => {
    router.push('/');
  }, [router]);

  // Send message handler
  const sendMessage = useCallback(
    async (text: string, attachments?: AttachmentData[]) => {
      if (!text.trim() && (!attachments || attachments.length === 0)) return;
      
      // If no conversation ID yet, create one first
      let id = conversationId;
      if (!id) {
        try {
          id = await createConversation(isGuest, projectFilterId ?? undefined);
          // Preserve project filter in URL if present
          const newUrl = projectFilterId ? `/chat/${id}?project=${projectFilterId}` : `/chat/${id}`;
          router.push(newUrl);
        } catch {
          toast.error('Failed to start conversation');
          return;
        }
      }
      
      // Construct message parts
      const parts: Array<{ type: 'text'; text: string } | FilePart> = [];
      
      if (text.trim()) {
        parts.push({ type: 'text', text: text.trim() });
      }
      
      // Convert AttachmentData to FilePart
      if (attachments && attachments.length > 0) {
        const fileParts: FilePart[] = attachments.map(att => ({
          type: 'file',
          url: att.url,
          filename: att.filename,
          mediaType: att.mimeType ?? 'application/octet-stream',
        }));
        parts.push(...fileParts);
      }
      
      // Persist effective IDs before manual send (in case store is not ready)
      if (!isGuest) {
        userAgentIdRef.current = userAgentIdRef.current ?? initialUserAgentId ?? selectedUserAgentId ?? undefined;
      } else {
        agentIdRef.current = agentIdRef.current ?? initialAgentId ?? undefined;
      }

      // Send to backend
      await sendMessageRaw({ parts });
    },
    [conversationId, createConversation, isGuest, router, sendMessageRaw, initialUserAgentId, selectedUserAgentId, initialAgentId, projectFilterId]
  );

  // tRPC mutation for getting presigned URL
  const getPresignedUrlMutation = trpcApi.storage.getPresignedUploadUrl.useMutation();

  // Handle file upload (only for logged-in users)
  const handleFileUpload = useCallback(async (files: File[]): Promise<AttachmentData[]> => {
    // Guest users cannot upload files
    if (isGuest) {
      throw new Error('Please sign in to upload files');
    }
    
    const uploadedAttachments: AttachmentData[] = [];
    
    for (const file of files) {
      try {
        // 1. Get presigned upload URL from tRPC
        const { uploadUrl, publicUrl } = await getPresignedUrlMutation.mutateAsync({
          filename: file.name,
          contentType: file.type,
          maxSizeBytes: 50 * 1024 * 1024, // 50MB max
        });
        
        // 2. Upload file directly to S3 using presigned URL
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }
        
        // 3. Return attachment with public URL
        uploadedAttachments.push({
          type: file.type.startsWith('image/') ? 'image' as const : 'file' as const,
          url: publicUrl,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        });
      } catch (error) {
        console.error('Failed to upload file:', file.name, error);
        throw error;
      }
    }
    
    return uploadedAttachments;
  }, [isGuest, getPresignedUrlMutation]);

  // Handle at bottom change
  const handleAtBottomChange = useCallback((isAtBottom: boolean) => {
    setAtBottom(isAtBottom);
  }, []);

  // Scroll to bottom
  const handleScrollToBottom = useCallback(() => {
    messageListRef.current?.scrollToBottom("smooth");
  }, []);

  const missingAgentForLoggedIn = !isGuest && !(userAgentIdRef.current ?? selectedUserAgentId ?? initialUserAgentId);

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* Shared Conversation Banner */}
      {isViewingShared && conversationId && (
        <SharedConversationBanner
          ownerName={conversationData?.owner?.name}
          ownerImage={conversationData?.owner?.image}
          isGuest={isGuest}
          conversationId={conversationId}
        />
      )}
      
      {/* Messages Area - flex-1 to fill space */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {isLoadingMessages ? (
          <MessageListSkeleton count={4} />
        ) : chatMessages.length === 0 ? (
          <EmptyConversationView />
        ) : (
          <>
            <ScrollableMessageList
              ref={messageListRef}
              messages={chatMessages as ChatUIMessage[]}
              conversationId={conversationId}
              isStreaming={isStreaming}
              onAtBottomChange={handleAtBottomChange}
              onRegenerate={handleRegenerate}
              onEdit={handleEdit}
              isReadOnly={isReadOnly}
            />

            {/* Scroll to Bottom Button */}
            {!atBottom && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10 rounded-full shadow-lg border border-border hover:shadow-xl transition-shadow"
                  onClick={handleScrollToBottom}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Guest Gate Message - Shows in message flow after first reply */}
      {isGuest && hasReceivedFirstReply && (
        <div className="flex-shrink-0 mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 py-6">
          <div className="rounded-lg border-2 border-primary/20 bg-card p-6 text-center space-y-4">
            <h3 className="text-lg font-semibold">{GUEST_MODE_COPY.GATE_TITLE}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {GUEST_MODE_COPY.GATE_DESCRIPTION()}
            </p>
            <Button 
              size="lg"
              onClick={() => setLoginModalOpen(true, '/', 'generate_gate')}
            >
              {GUEST_MODE_COPY.GATE_CTA}
            </Button>
          </div>
        </div>
      )}

      {/* Error Display Area - Between messages and input */}
      {error && (
        <div className="flex-shrink-0 mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6">
          <ErrorMessage 
            error={error} 
            onNewChat={handleNewChat}
            onDismiss={clearError}
          />
        </div>
      )}

      {/* Input Area - fixed at bottom */}
      <div className="flex-shrink-0 relative">
        {isReadOnly ? (
          <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 py-3 md:py-4">
            <div className="p-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-lg border border-border/40">
              This is a read-only conversation.{" "}
              {isGuest ? (
                <button
                  onClick={() => {
                    const currentPath = window.location.pathname;
                    setLoginModalOpen(true, currentPath, 'generate_gate');
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              ) : (
                <span>Use the Fork button above to continue chatting.</span>
              )}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 py-3 md:py-4">
            <ChatInput
              onSendMessage={(text, attachments) => {
                void sendMessage(text, attachments).catch((err: unknown) => {
                  console.error('Failed to send message:', err);
                });
              }}
              onStopGeneration={() => {
                void stop();
              }}
              onFileUpload={handleFileUpload}
              disabled={isStreaming || isCreating || (isGuest && hasReceivedFirstReply) || missingAgentForLoggedIn}
              isGenerating={isStreaming}
              disableFileUpload={isGuest}
              placeholder={
                isCreating
                  ? "Creating conversation..."
                  : (isGuest && hasReceivedFirstReply)
                  ? "Sign in to continue..."
                  : (missingAgentForLoggedIn)
                  ? "Please select an agent to begin"
                  : "Message App..."
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}