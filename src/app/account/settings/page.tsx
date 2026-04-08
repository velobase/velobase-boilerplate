import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/server/auth';
import { ConversationSidebar } from '@/components/conversation-sidebar';
import { AccountPageLayout } from '@/components/account/account-page-layout';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { 
  PreferencesSection, 
  PrivacySection, 
  DangerZoneSection,
  TelegramSection,
} from '@/components/account/settings';

/**
 * Settings Page - User account settings
 * Route: /account/settings
 */
export default async function SettingsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=%2Faccount%2Fsettings');
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
              <h1 className="text-2xl font-semibold tracking-tight leading-8">Settings</h1>
              <p className="mt-2 text-sm text-muted-foreground leading-5">
                Manage your account settings and preferences
              </p>
            </div>

            {/* Settings Sections */}
            <div className="space-y-6">
              {/* Quick Link to Profile */}
              <Card className="bg-muted/30 border-muted">
                <CardContent className="flex items-center justify-between p-4">
                  <p className="text-sm text-muted-foreground">
                    Update name and profile picture in{" "}
                    <Link 
                      href="/account/profile"
                      className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
                    >
                      Profile
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </p>
                </CardContent>
              </Card>

              {/* Preferences Section */}
              <PreferencesSection />

              {/* Telegram Stars Payment */}
              <TelegramSection />

              {/* Privacy & Security */}
              <PrivacySection />

              {/* Danger Zone */}
              <DangerZoneSection userEmail={session.user.email ?? null} />
            </div>
          </div>
        </AccountPageLayout>
      </div>
    </div>
  );
}

