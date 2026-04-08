'use server';

import { auth } from '@/server/auth';
import { ConversationSidebar } from '@/components/conversation-sidebar';
import { ExplorerPageContent } from '@/components/explorer/explorer-page-content';

export default async function ExplorerPage() {
  const session = await auth();
  const isGuest = !session?.user;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <ConversationSidebar className="hidden md:flex" isGuest={isGuest} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950/50">
        <div className="flex-1 overflow-y-auto">
          <ExplorerPageContent isGuest={isGuest} />
        </div>
      </div>
    </div>
  );
}

