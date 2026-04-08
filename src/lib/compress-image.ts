import imageCompression from "browser-image-compression";

/**
 * Compress image for AI analysis
 * Target: max 1920px, quality 0.8, output ~200KB-500KB
 */
export async function compressImageForAnalysis(file: File): Promise<File> {
  // Skip compression for small images (< 500KB)
  if (file.size < 500 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: 1, // Max 1MB output
    maxWidthOrHeight: 1920, // Max dimension
    useWebWorker: true, // Use web worker for better performance
    fileType: file.type as "image/jpeg" | "image/png" | "image/webp", // Preserve original format
  };

  try {
    const compressedFile = await imageCompression(file, options);
    // eslint: no-console (only warn/error allowed)
    console.warn(
      `[compress-image] ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
    );
    return compressedFile;
  } catch (error) {
    console.error("[compress-image] Compression failed, using original:", error);
    return file;
  }
}

/**
 * Convert ArrayBuffer to base64 string (browser-compatible)
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Compress image and convert to base64
 */
export async function compressImageToBase64(file: File): Promise<{
  base64: string;
  mimeType: string;
}> {
  const compressedFile = await compressImageForAnalysis(file);
  const arrayBuffer = await compressedFile.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  return {
    base64,
    mimeType: compressedFile.type || "image/jpeg",
  };
}

