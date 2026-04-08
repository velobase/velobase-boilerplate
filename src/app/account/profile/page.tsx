import { redirect } from 'next/navigation';
import { auth } from '@/server/auth';
import { ConversationSidebar } from '@/components/conversation-sidebar';
import { AccountPageLayout } from '@/components/account/account-page-layout';
import { ProfileForm } from '@/components/account/profile-form';

/**
 * Profile Page - User profile information
 * Route: /account/profile
 */
export default async function ProfilePage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=%2Faccount%2Fprofile');
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <ConversationSidebar className="hidden md:flex" />
      
      {/* Main Content Area with Inset Navigation */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950/50">
        <AccountPageLayout>
          <div className="max-w-[768px] mx-auto px-8 py-8 w-full">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight leading-8">Profile</h1>
              <p className="mt-2 text-sm text-muted-foreground leading-5">
                Manage your public profile information
              </p>
            </div>

            {/* Profile Form */}
            <ProfileForm 
              user={{
                id: session.user.id,
                name: session.user.name ?? null,
                email: session.user.email ?? null,
                image: session.user.image ?? null,
              }}
            />
          </div>
        </AccountPageLayout>
      </div>
    </div>
  );
}

