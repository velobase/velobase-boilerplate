import { auth } from "@/server/auth";
import { StartPanel, ChatHeader } from "@/modules/ai-chat/components";
import { ConversationSidebar } from "@/components/conversation-sidebar";
import { GUEST_MODE_CONFIG } from "@/config/guest-mode";

/**
 * New Chat Page - Start a fresh conversation
 * Route: /chat
 */
export default async function NewChatPage() {
  const session = await auth();
  const isGuest = !session;

  return (
    <div className="flex h-full md:h-screen w-full overflow-hidden">
      {/* Sidebar - Desktop only */}
      <ConversationSidebar className="hidden md:flex" isGuest={isGuest} />
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Chat Header - Desktop only (mobile uses MobileShell header) */}
        <div className="hidden md:block">
          <ChatHeader isGuest={isGuest} />
        </div>
        
        {/* Start Panel */}
        <StartPanel 
          isGuest={isGuest}
          agentId={isGuest ? GUEST_MODE_CONFIG.DEFAULT_GUEST_AGENT : undefined}
        />
      </div>
    </div>
  );
}
