"use client";

import { useState, useRef } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onUploadComplete?: (fileUrl: string, fileKey: string) => void;
  onUploadError?: (error: string) => void;
  acceptedFileTypes?: string;
  maxFileSizeMB?: number;
  label?: string;
  className?: string;
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  acceptedFileTypes = "image/*,application/pdf,.doc,.docx",
  maxFileSizeMB = 10,
  label = "Upload File",
  className,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPresignedUrl = api.storage.getPresignedUploadUrl.useMutation();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage(`File size exceeds ${maxFileSizeMB}MB limit`);
      setUploadStatus("error");
      onUploadError?.(`File size exceeds ${maxFileSizeMB}MB limit`);
      return;
    }

    setSelectedFile(file);
    setUploadStatus("idle");
    setErrorMessage("");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadStatus("uploading");
      setUploadProgress(0);

      // Get presigned URL from backend
      const { uploadUrl, publicUrl, fileKey } = await getPresignedUrl.mutateAsync({
        filename: selectedFile.name,
        contentType: selectedFile.type,
        maxSizeBytes: maxFileSizeMB * 1024 * 1024,
      });

      // Upload file directly to storage using presigned URL
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type);
        xhr.send(selectedFile);
      });

      // Success
      setUploadStatus("success");
      setUploadedFileUrl(publicUrl);
      onUploadComplete?.(publicUrl, fileKey);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setSelectedFile(null);
        setUploadProgress(0);
        setUploadStatus("idle");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      const message = error instanceof Error ? error.message : "Upload failed";
      setErrorMessage(message);
      setUploadStatus("error");
      onUploadError?.(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus("idle");
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className={cn("p-6", className)}>
      <div className="space-y-4">
        {/* Label */}
        {label && <Label className="text-base font-semibold">{label}</Label>}

        {/* File Input */}
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes}
            onChange={handleFileSelect}
            disabled={isUploading}
            className="flex-1"
          />
          {selectedFile && uploadStatus === "idle" && (
            <Button
              onClick={handleCancel}
              variant="ghost"
              size="icon"
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="text-sm text-muted-foreground">
            <div>File: {selectedFile.name}</div>
            <div>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
            <div>Type: {selectedFile.type || "Unknown"}</div>
          </div>
        )}

        {/* Upload Progress */}
        {uploadStatus === "uploading" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading... {uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success Message */}
        {uploadStatus === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Upload successful!</span>
          </div>
        )}

        {/* Error Message */}
        {uploadStatus === "error" && errorMessage && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && uploadStatus === "idle" && (
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </Button>
        )}

        {/* Uploaded File URL (for debugging/copying) */}
        {uploadedFileUrl && uploadStatus === "success" && (
          <div className="rounded-md bg-muted p-3">
            <div className="text-xs text-muted-foreground">File URL:</div>
            <div className="break-all text-sm font-mono">{uploadedFileUrl}</div>
          </div>
        )}
      </div>
    </Card>
  );
}

