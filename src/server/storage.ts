import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";
import { createLogger } from "@/lib/logger";
import type { PutObjectCommandInput } from "@aws-sdk/client-s3";

type StorageProvider = "aws" | "aliyun" | "gcs" | "minio" | "r2";

interface StorageConfig {
  region: string;
  endpoint?: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  forcePathStyle?: boolean;
  requestTimeout?: number;
  connectionTimeout?: number;
}

/**
 * Get S3 client based on provider configuration
 */
export function getStorageClient(): S3Client {
  const provider = (env.STORAGE_PROVIDER ?? "aws") as StorageProvider;
  
  const configs: Record<StorageProvider, StorageConfig> = {
    aws: {
      region: env.STORAGE_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY ?? "",
      },
      requestTimeout: 300000, // 5 minutes for large files
      connectionTimeout: 30000, // 30 seconds to establish connection
    },
    aliyun: {
      region: env.STORAGE_REGION ?? "oss-cn-hangzhou",
      endpoint: env.STORAGE_ENDPOINT ?? `https://${env.STORAGE_REGION ?? "oss-cn-hangzhou"}.aliyuncs.com`,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY ?? "",
      },
      forcePathStyle: false, // Aliyun OSS uses virtual-hosted style by default
      requestTimeout: 300000, // 5 minutes for large files
      connectionTimeout: 30000, // 30 seconds to establish connection
    },
    gcs: {
      region: "auto",
      endpoint: env.STORAGE_ENDPOINT ?? "https://storage.googleapis.com",
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY ?? "",
      },
    },
    minio: {
      region: env.STORAGE_REGION ?? "us-east-1",
      endpoint: env.STORAGE_ENDPOINT ?? "http://localhost:9000",
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY ?? "",
      },
      forcePathStyle: true,
    },
    r2: {
      region: "auto", // R2 uses 'auto' region
      endpoint: env.STORAGE_ENDPOINT, // e.g., https://<account-id>.r2.cloudflarestorage.com
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY ?? "",
      },
      forcePathStyle: false,
      requestTimeout: 300000,
      connectionTimeout: 30000,
    },
  };

  const config = configs[provider];
  
  if (!config.credentials.accessKeyId || !config.credentials.secretAccessKey) {
    throw new Error(`Storage credentials not configured for provider: ${provider}`);
  }

  return new S3Client(config);
}

/**
 * Get storage bucket name
 */
export function getStorageBucket(): string {
  const bucket = env.STORAGE_BUCKET;
  if (!bucket) {
    throw new Error("STORAGE_BUCKET environment variable is not set");
  }
  return bucket;
}

/**
 * Generate a unique file key with timestamp and random string
 */
export function generateFileKey(filename: string, userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = filename.split(".").pop();
  return `uploads/${userId}/${timestamp}-${random}.${extension}`;
}

/**
 * Get public URL for a file
 * Note: This generates the public URL format. For temporary access, use getStorageSignedUrl instead.
 */
export function getPublicUrl(key: string): string {
  // If CDN URL is configured, use it
  if (env.CDN_BASE_URL) {
    return `${env.CDN_BASE_URL}/${key}`;
  }
  
  const provider = env.STORAGE_PROVIDER ?? "aws";
  const bucket = getStorageBucket();
  const region = env.STORAGE_REGION ?? "us-east-1";
  
  if (provider === "aws") {
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  } else if (provider === "aliyun") {
    // Aliyun OSS uses virtual-hosted style: https://bucket.region.aliyuncs.com/key
    return `https://${bucket}.${region}.aliyuncs.com/${key}`;
  } else if (provider === "gcs") {
    return `https://storage.googleapis.com/${bucket}/${key}`;
  } else if (provider === "minio") {
    const endpoint = env.STORAGE_ENDPOINT ?? "http://localhost:9000";
    return `${endpoint}/${bucket}/${key}`;
  } else if (provider === "r2") {
    // R2 with custom domain configured via CDN_BASE_URL
    // Fallback to R2.dev URL if no CDN configured
    return `https://${bucket}.r2.dev/${key}`;
  }
  
  return `${env.STORAGE_ENDPOINT}/${bucket}/${key}`;
}

/**
 * Upload object to storage
 */
export async function putObject(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<void> {
  const client = getStorageClient();
  const bucket = getStorageBucket();
  const logger = createLogger("storage");

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  } catch (err: unknown) {
    // Enhance AWS error visibility
    const e = err as Record<string, unknown>;
    const meta = e?.$metadata as { httpStatusCode?: number; requestId?: string; attempts?: number; totalRetryDelay?: number } | undefined;
    logger.error({
      err: e,
      bucket,
      key,
      contentType,
      httpStatusCode: meta?.httpStatusCode,
      requestId: meta?.requestId,
      attempts: meta?.attempts,
      totalRetryDelay: meta?.totalRetryDelay,
    }, "S3 PutObject failed");
    throw err;
  }
}

/**
 * Get signed URL for download (temporary access)
 * @param key - Object key
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 */
export async function getStorageSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getStorageClient();
  const bucket = getStorageBucket();
  
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate presigned URL for upload
 * @param key - Object key
 * @param contentType - File content type
 * @param expiresIn - URL expiration time in seconds (default: 900 = 15 minutes)
 */
export async function getUploadPresignedUrl(
  key: string,
  contentType: string,
  expiresIn = 900
): Promise<string> {
  const client = getStorageClient();
  const bucket = getStorageBucket();

  const commandInput: PutObjectCommandInput = {
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  };

  const command = new PutObjectCommand(commandInput);

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate storage key for video
 */
export function generateVideoKey(
  userId: string,
  agentId: string,
  videoId: string,
  variant: string
): string {
  return `${userId}/videos/${agentId}/${videoId}/${variant}.mp4`;
}

/**
 * Generate storage key for thumbnail
 */
export function generateThumbnailKey(
  userId: string,
  agentId: string,
  videoId: string
): string {
  return `${userId}/videos/${agentId}/${videoId}/thumbnail.jpg`;
}

/**
 * Generate storage key for image
 */
export function generateImageKey(
  userId: string,
  imageId: string,
  extension = "png"
): string {
  return `${userId}/images/${imageId}.${extension}`;
}

/**
 * Get object from storage as Buffer
 */
export async function getObject(key: string): Promise<Buffer> {
  const client = getStorageClient();
  const bucket = getStorageBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await client.send(command);
  const stream = response.Body;

  if (!stream) {
    throw new Error(`Failed to get object: ${key}`);
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Download image from URL and upload to storage
 * @returns Storage key and public URL
 */
export async function downloadAndUploadImage(
  imageUrl: string,
  userId: string,
  imageId: string
): Promise<{ storageKey: string; publicUrl: string }> {
  const logger = createLogger("storage");

  logger.info({ imageUrl, userId, imageId }, "Downloading image from URL");

  // Download image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download image: ${response.status} ${response.statusText}`
    );
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "image/png";
  
  // Determine file extension from content type
  const extension = contentType.split("/")[1] ?? "png";
  const storageKey = generateImageKey(userId, imageId, extension);

  logger.info({ storageKey, size: imageBuffer.length }, "Uploading image to storage");

  // Upload to storage
  await putObject(imageBuffer, storageKey, contentType);

  // Get public URL
  const publicUrl = getPublicUrl(storageKey);

  logger.info({ publicUrl }, "Image uploaded successfully");

  return { storageKey, publicUrl };
}
