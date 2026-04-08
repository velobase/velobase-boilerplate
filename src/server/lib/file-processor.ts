import { submitDatalabConversion, pollDatalabResult } from "./datalab";
import { createLogger } from "@/lib/logger";
import type { DocumentProcessingData } from "@/types/interaction";

const logger = createLogger("file-processor");

/**
 * Check if file type needs document conversion
 */
export function needsDocumentConversion(mediaType: string): boolean {
  const convertibleTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
    'application/msword',      // .doc
    'application/vnd.ms-excel', // .xls
  ];
  
  return convertibleTypes.includes(mediaType);
}

/**
 * Process file and convert to markdown
 * @returns DocumentProcessingData with status and content
 */
export async function processFileToMarkdown(
  url: string,
  filename: string,
  mediaType: string,
): Promise<DocumentProcessingData> {
  try {
    // Skip if not a document
    if (!needsDocumentConversion(mediaType)) {
      logger.info({ filename, mediaType }, "File does not need conversion");
      return {
        filename,
        sourceUrl: url,
        markdown: "",
        status: "completed",
      };
    }

    logger.info({ filename, url }, "Starting document conversion");

    // Submit to Datalab
    const { request_id, request_check_url } = await submitDatalabConversion(
      url,
      {
        output_format: "markdown",
        disable_image_extraction: true,
        force_ocr: false,
        paginate: false,
      },
    );

    logger.info(
      { request_id, filename },
      "Conversion submitted, polling for result",
    );

    // Poll for result (max 30 attempts, 2s interval = 1 minute total)
    const result = await pollDatalabResult(request_check_url, 30, 2000);

    if (result.status === "complete" && result.success && result.markdown) {
      logger.info(
        {
          request_id,
          filename,
          markdownLength: result.markdown.length,
        },
        "Conversion completed successfully",
      );

      return {
        filename,
        sourceUrl: url,
        markdown: result.markdown,
        status: "completed",
        pageCount: result.page_count,
      };
    } else {
      logger.warn(
        {
          request_id,
          filename,
          status: result.status,
          error: result.error,
        },
        "Conversion failed or incomplete",
      );

      return {
        filename,
        sourceUrl: url,
        markdown: "",
        status: "failed",
        error: result.error ?? "Conversion failed",
      };
    }
  } catch (error) {
    logger.error(
      {
        err: error,
        filename,
        url,
      },
      "File conversion error",
    );

    return {
      filename,
      sourceUrl: url,
      markdown: "",
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process all file attachments and return document processing results
 * @returns Array of DocumentProcessingData for files that need conversion
 */
export async function processFileAttachments(
  fileParts: Array<{ url: string; filename?: string; mediaType: string }>,
): Promise<DocumentProcessingData[]> {
  const results: DocumentProcessingData[] = [];

  for (const file of fileParts) {
    const filename =
      file.filename ?? file.url.split("/").pop() ?? "document";

    // Only process documents (skip images and other files)
    if (needsDocumentConversion(file.mediaType)) {
      const result = await processFileToMarkdown(
        file.url,
        filename,
        file.mediaType,
      );
      results.push(result);
    }
  }

  return results;
}

