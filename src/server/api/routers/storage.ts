import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { 
  getStorageClient, 
  getStorageBucket, 
  generateFileKey,
  getPublicUrl,
  resolveStorageKey,
} from "@/server/storage";
import { createLogger } from "@/lib/logger";

const logger = createLogger('storage-router');

export const storageRouter = createTRPCRouter({
  // Generate presigned URL for upload
  getPresignedUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        maxSizeBytes: z.number().optional().default(10 * 1024 * 1024), // 10MB default
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const s3Client = getStorageClient();
        const bucket = getStorageBucket();
        const key = generateFileKey(input.filename, ctx.session.user.id);

        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: resolveStorageKey(key),
          ContentType: input.contentType,
          Metadata: {
            userId: ctx.session.user.id,
            originalFilename: input.filename,
          },
        });

        // Generate presigned URL (valid for 5 minutes)
        const presignedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 300,
        });

        const publicUrl = getPublicUrl(key);

        return {
          uploadUrl: presignedUrl,
          fileKey: key,
          publicUrl,
        };
      } catch (error) {
        logger.error({ err: error }, 'Failed to generate presigned URL');
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate upload URL",
        });
      }
    }),

  // Delete file
  deleteFile: protectedProcedure
    .input(
      z.object({
        fileKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const s3Client = getStorageClient();
        const bucket = getStorageBucket();

        // Verify the file belongs to the user (key should contain userId)
        if (!input.fileKey.includes(ctx.session.user.id)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to delete this file",
          });
        }

        const command = new DeleteObjectCommand({
          Bucket: bucket,
          Key: resolveStorageKey(input.fileKey),
        });

        await s3Client.send(command);

        return { success: true };
      } catch (error) {
        logger.error({ err: error }, 'Failed to delete file');
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete file",
        });
      }
    }),

  // Get presigned URL for download (optional, for private files)
  getPresignedDownloadUrl: protectedProcedure
    .input(
      z.object({
        fileKey: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const s3Client = getStorageClient();
        const bucket = getStorageBucket();

        // Verify the file belongs to the user
        if (!input.fileKey.includes(ctx.session.user.id)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You don't have permission to access this file",
          });
        }

        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: resolveStorageKey(input.fileKey),
        });

        // Generate presigned URL (valid for 1 hour)
        const presignedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 3600,
        });

        return {
          downloadUrl: presignedUrl,
        };
      } catch (error) {
        logger.error({ err: error }, 'Failed to generate download URL');
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate download URL",
        });
      }
    }),
});

