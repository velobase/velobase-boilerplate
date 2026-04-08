import { submitDatalabConversion, pollDatalabResult } from "./datalab";
import { buildDocumentPrompt } from "./file-utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger('attachment-helpers');

/**
 * Convert document to markdown (for caching)
 * Called when saving messages to database
 */
export async function convertDocument(url: string, mimeType: string): Promise<{
  markdown: string | null;
  pageCount: number | null;
  status: 'complete' | 'failed';
}> {
  try {
    logger.info({ url, mimeType }, 'Converting document with Datalab');

    // Submit to Datalab for conversion
    const { request_check_url } = await submitDatalabConversion(url, {
      output_format: 'markdown',
      disable_image_extraction: true,
      force_ocr: false,
      paginate: true,
    });

    // Poll for result (max 30 seconds)
    const result = await pollDatalabResult(
      request_check_url,
      15,   // 15 attempts
      2000  // every 2 seconds
    );

    if (result.status === 'complete' && result.markdown) {
      logger.info({ pageCount: result.page_count }, 'Document converted successfully');
      
      return {
        markdown: result.markdown,
        pageCount: result.page_count ?? null,
        status: 'complete',
      };
    } else {
      logger.warn({ status: result.status }, 'Document conversion incomplete');
      
      return {
        markdown: null,
        pageCount: null,
        status: 'failed',
      };
    }
  } catch (error) {
    logger.error({ err: error }, 'Document conversion failed');
    
    return {
      markdown: null,
      pageCount: null,
      status: 'failed',
    };
  }
}

/**
 * Build AI-compatible message format
 * Converts attachments to OpenRouter format
 * Called when building agent history for AI
 */
export function buildAIMessage(
  inputItem: { role: string; content: string; metadata?: unknown },
  attachments: Array<{
    id: string;
    type: string;
    url: string;
    filename?: string | null;
    mimeType?: string | null;
    convertedContent?: string | null;
    conversionMeta?: { pageCount?: number } | null;
  }>
): { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>; metadata?: unknown } {
  const { role, content, metadata } = inputItem;
  
  // Debug: Log input parameters
  logger.info({
    inputItem,
    attachmentsCount: attachments?.length ?? 0,
    attachments: attachments?.map(a => ({ type: a.type, hasConverted: !!a.convertedContent }))
  }, 'buildAIMessage called');

  // If no attachments, return as-is
  if (!attachments || attachments.length === 0) {
    return { role, content, ...(metadata ? { metadata } : {}) };
  }

  // Build content array for multimodal format
  const contentParts: Array<{
    type: string;
    text?: string;
    image_url?: { url: string };
  }> = [];

  // 1. Add original prompt
  if (content) {
    contentParts.push({
      type: "text",
      text: content,
    });
  }

  // 2. Process attachments
  let hasImages = false;
  
  for (const att of attachments) {
    if (att.convertedContent) {
      // Document: append markdown with formatted prompt as text
      const documentPrompt = buildDocumentPrompt(
        att.filename ?? null,
        att.mimeType ?? null,
        att.convertedContent,
        att.conversionMeta?.pageCount ?? null
      );
      
      contentParts.push({
        type: "text",
        text: documentPrompt,
      });
    } else if (att.type === 'image') {
      // Image: OpenRouter image_url format
      hasImages = true;
      contentParts.push({
        type: "image_url",
        image_url: {
          url: att.url,
        },
      });
    }
  }

  // If only text (no images), merge all text parts into a single string
  if (!hasImages) {
    const allText = contentParts
      .filter(p => p.type === 'text')
      .map(p => p.text)
      .join('\n\n');
    
    const result = {
      role,
      content: allText,
      ...(metadata ? { metadata } : {}),
    };
    
    // Debug: Log the result
    logger.info({
      result: JSON.stringify(result, null, 2)
    }, 'buildAIMessage result (text-only, merged)');
    
    return result;
  }

  // Return multimodal format (has images)
  const result = {
    role,
    content: contentParts,
    ...(metadata ? { metadata } : {}),
  };
  
  // Debug: Log the result
  logger.info({
    result: JSON.stringify(result, null, 2)
  }, 'buildAIMessage result (multimodal with images)');
  
  return result;
}

