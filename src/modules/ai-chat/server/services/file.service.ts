import { createLogger } from "@/lib/logger";
import type { DocumentProcessingData } from "../../types/interaction";

const logger = createLogger("ai-chat:file-service");

export interface FileProcessorInput {
  url: string;
  filename?: string;
  mediaType: string;
}

export interface FileProcessorAdapter {
  needsDocumentConversion: (mediaType: string) => boolean;
  processFileToMarkdown: (
    url: string,
    filename: string,
    mediaType: string,
  ) => Promise<DocumentProcessingData>;
}

// Default no-op adapter (host app should provide real implementation)
export const defaultFileProcessorAdapter: FileProcessorAdapter = {
  needsDocumentConversion: () => false,
  async processFileToMarkdown(url, filename, mediaType) {
    logger.warn({ url, filename, mediaType }, "No file processor adapter configured; skipping conversion");
    return {
      filename,
      sourceUrl: url,
      markdown: "",
      status: "completed",
    };
  },
};

let currentAdapter: FileProcessorAdapter = defaultFileProcessorAdapter;

export function configureFileProcessorAdapter(adapter: FileProcessorAdapter) {
  currentAdapter = adapter;
}

export function getFileProcessorAdapter(): FileProcessorAdapter {
  return currentAdapter;
}

export async function processFileAttachments(
  fileParts: FileProcessorInput[],
): Promise<DocumentProcessingData[]> {
  const results: DocumentProcessingData[] = [];
  const adapter = getFileProcessorAdapter();

  for (const file of fileParts) {
    const filename = file.filename ?? file.url.split("/").pop() ?? "document";
    if (adapter.needsDocumentConversion(file.mediaType)) {
      const result = await adapter.processFileToMarkdown(file.url, filename, file.mediaType);
      results.push(result);
    }
  }

  return results;
}


