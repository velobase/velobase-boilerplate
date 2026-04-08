"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Save, X, Loader2 } from "lucide-react";

interface ProfileFieldsProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export function ProfileFields({ user }: ProfileFieldsProps) {
  const [name, setName] = useState(user.name ?? "");
  const [originalName, setOriginalName] = useState(user.name ?? "");
  const { update: updateSession } = useSession();
  const utils = api.useUtils();
  
  // Check if there are unsaved changes
  const hasChanges = name !== originalName && name.trim() !== "";
  const canSave = hasChanges && name.trim().length > 0;
  
  // Mutation
  const updateProfile = api.account.updateProfile.useMutation({
    onSuccess: async () => {
      // Update original name to current value after successful save
      setOriginalName(name.trim());
      
      // Invalidate queries to refresh UI
      await Promise.all([
        // Refresh session data for sidebar
        updateSession(),
        // Invalidate related queries
        utils.account.getProfile.invalidate(),
        utils.account.getBillingStatus.invalidate(),
      ]);
      
      toast.success("Profile updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    
    try {
      await updateProfile.mutateAsync({ name: name.trim() });
    } catch {
      // Error handled by mutation onError
    }
  }, [canSave, name, updateProfile]);

  const handleCancel = useCallback(() => {
    setName(originalName);
  }, [originalName]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  }, []);

  // Character count
  const charCount = name.length;
  const maxChars = 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="name"
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="Enter your name"
                maxLength={maxChars}
                className={cn(
                  "pr-12",
                  hasChanges && "border-amber-500/50"
                )}
              />
              
              {/* Character count */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className={cn(
                  "text-xs",
                  charCount > maxChars * 0.9 ? "text-amber-500" : "text-muted-foreground"
                )}>
                  {charCount}/{maxChars}
                </span>
              </div>
            </div>
            
            {/* Save/Cancel buttons */}
            {hasChanges && (
              <div className="flex gap-2 animate-in slide-in-from-top-1 duration-200">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!canSave || updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-3 w-3" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateProfile.isPending}
                >
                  <X className="mr-2 h-3 w-3" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={user.email ?? ""}
            disabled
            className="bg-muted cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed for security reasons
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
