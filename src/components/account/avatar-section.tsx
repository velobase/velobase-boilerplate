"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AvatarSectionProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export function AvatarSection({ user }: AvatarSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(user.image);
  const [isHovering, setIsHovering] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const { update: updateSession } = useSession();
  const utils = api.useUtils();
  
  // Mutations
  const getPresignedUrl = api.storage.getPresignedUploadUrl.useMutation();
  const updateProfile = api.account.updateProfile.useMutation();
  
  const userInitial = (user.name || user.email)?.[0]?.toUpperCase() || "U";
  const isUploading = uploadProgress > 0 && uploadProgress < 100;

  const handleAvatarClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be less than ${maxSizeMB}MB`);
      return;
    }

    try {
      // Show local preview immediately
      const localPreview = URL.createObjectURL(file);
      setAvatarUrl(localPreview);
      setUploadProgress(10);

      // Get presigned URL
      const { uploadUrl, publicUrl } = await getPresignedUrl.mutateAsync({
        filename: file.name,
        contentType: file.type,
        maxSizeBytes: maxSizeMB * 1024 * 1024,
      });

      // Upload with progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        });

        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Upload failed"));

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // Update avatar URL and save to database
      setAvatarUrl(publicUrl);
      URL.revokeObjectURL(localPreview);
      
      // Auto save to database
      await updateProfile.mutateAsync({ image: publicUrl });
      
      // Invalidate queries to refresh UI
      await Promise.all([
        // Refresh session data for sidebar
        updateSession(),
        // Invalidate related queries
        utils.account.getProfile.invalidate(),
        utils.account.getBillingStatus.invalidate(),
      ]);
      
      setIsSaved(true);
      toast.success("Profile picture updated");
      
      // Hide saved indicator after 3 seconds
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);

    } catch (error) {
      console.error("Avatar upload error:", error);
      // Revert to original
      setAvatarUrl(user.image);
      toast.error(error instanceof Error ? error.message : "Failed to upload");
    } finally {
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };


  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-4">
          <div 
            className="relative cursor-pointer group"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={handleAvatarClick}
          >
            <Avatar className="h-32 w-32 transition-all duration-200 group-hover:ring-4 ring-primary/20">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-primary/10 to-primary/20">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            
            {/* Upload overlay */}
            <div className={cn(
              "absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity duration-200",
              isHovering && !isUploading ? "opacity-100" : "opacity-0",
              "pointer-events-none"
            )}>
              <Camera className="h-8 w-8 text-white" />
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <div className="text-white text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <span className="text-sm">{uploadProgress}%</span>
                </div>
              </div>
            )}

            {/* Save status indicator */}
            {isSaved && (
              <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-1 animate-in zoom-in duration-200">
                <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <p className="text-xs text-muted-foreground text-center">
            JPG, PNG or GIF • Max 5MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
