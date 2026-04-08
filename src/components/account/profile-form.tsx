"use client";

import { AvatarSection } from "./avatar-section";
import { ProfileFields } from "./profile-fields";
import { AccountIdRow } from "./account-id-row";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface ProfileFormProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

/**
 * Profile Form Component - Container for profile management
 * Uses modular components for better organization and UX
 */
export function ProfileForm({ user }: ProfileFormProps) {
  return (
    <div className="space-y-6">
      {/* Avatar Upload Section */}
      <AvatarSection user={user} />

      {/* Profile Fields */}
      <ProfileFields user={user} />

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountIdRow accountId={user.id} />
        </CardContent>
      </Card>

    </div>
  );
}
