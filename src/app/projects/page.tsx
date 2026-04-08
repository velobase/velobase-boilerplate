'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { ConversationSidebar } from '@/components/conversation-sidebar';
import { api } from '@/trpc/server';
import { ProjectsPageContent } from '@/components/projects/projects-page-content';

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=%2Fprojects');
  }

  // Fetch user's projects
  const projects = await api.project.list({ status: 'active' });

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <ConversationSidebar className="hidden md:flex" />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950/50">
        <div className="flex-1 overflow-y-auto">
          <ProjectsPageContent projects={projects} />
        </div>
      </div>
    </div>
  );
}

