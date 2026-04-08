import { env } from "@/env";
import { createLogger } from "@/lib/logger";

const logger = createLogger('datalab');

/**
 * Datalab API Integration
 * Documentation: https://documentation.datalab.to/docs/welcome/api
 */

interface DatalabSubmitRequest {
  output_format?: "markdown" | "text";
  disable_image_extraction?: boolean;
  force_ocr?: boolean;
  paginate?: boolean;
}

interface DatalabSubmitResponse {
  success: boolean;
  error: string | null;
  request_id: string;
  request_check_url: string;
}

interface DatalabCheckResponse {
  status: "processing" | "complete";
  success: boolean;
  output_format?: string;
  markdown?: string;
  text?: string;
  images?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  page_count?: number;
  error?: string;
}

/**
 * Submit a document to Datalab for conversion using file URL
 * @param fileUrl - Public URL of the file to convert
 * @param options - Conversion options
 * @returns Submit response with request ID and check URL
 */
export async function submitDatalabConversion(
  fileUrl: string,
  options: DatalabSubmitRequest = {}
): Promise<DatalabSubmitResponse> {
  if (!env.DATALAB_API_KEY) {
    throw new Error('DATALAB_API_KEY is not configured');
  }

  logger.info({ fileUrl, options }, 'Submitting document to Datalab');

  try {
    // Download file from URL
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file from URL: ${fileResponse.statusText}`);
    }
    
    const fileBlob = await fileResponse.blob();
    const fileName = fileUrl.split('/').pop() ?? 'document.pdf';
    
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('output_format', options.output_format ?? 'markdown');
    formData.append('disable_image_extraction', String(options.disable_image_extraction ?? true));
    formData.append('force_ocr', String(options.force_ocr ?? false));
    formData.append('paginate', String(options.paginate ?? false));

    const response = await fetch(`${env.DATALAB_BASE_URL}/api/v1/marker`, {
      method: "POST",
      headers: {
        "X-Api-Key": env.DATALAB_API_KEY ?? '',
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(
        `Datalab submission failed: ${errorData.error ?? response.statusText}`
      );
    }

    const result = await response.json() as DatalabSubmitResponse;
    
    logger.info({ request_id: result.request_id }, 'Document submitted successfully');
    
    return result;
  } catch (err) {
    logger.error({ err, fileUrl }, 'Failed to submit document to Datalab');
    throw err;
  }
}

/**
 * Poll Datalab for conversion result
 * @param checkUrl - The check URL from submit response
 * @param maxAttempts - Maximum number of polling attempts (default: 1)
 * @param delayMs - Delay between attempts in milliseconds (default: 0)
 * @returns Check response with status and converted content
 */
export async function pollDatalabResult(
  checkUrl: string,
  maxAttempts = 1,
  delayMs = 0
): Promise<DatalabCheckResponse> {
  if (!env.DATALAB_API_KEY) {
    throw new Error('DATALAB_API_KEY is not configured');
  }

  logger.info({ checkUrl, maxAttempts, delayMs }, 'Starting to poll Datalab result');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const response = await fetch(checkUrl, {
      method: "GET",
      headers: {
        "X-Api-Key": env.DATALAB_API_KEY ?? '',
      },
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(
        `Datalab check failed: ${errorData.error ?? response.statusText}`
      );
    }

    const result = (await response.json()) as DatalabCheckResponse;

    logger.info({ attempt, status: result.status }, 'Poll attempt result');

    // If complete, return immediately
    if (result.status === "complete") {
      logger.info({ status: result.status, page_count: result.page_count }, 'Conversion finished');
      return result;
    }

    // Continue polling if still processing
  }

  // Return the last result (likely still processing)
  const finalResponse = await fetch(checkUrl, {
    method: "GET",
    headers: {
      "X-Api-Key": env.DATALAB_API_KEY ?? '',
    },
  });

  const finalResult = await finalResponse.json() as DatalabCheckResponse;
  
  logger.info({ finalStatus: finalResult.status }, 'Final poll result');

  return finalResult;
}

/**
 * Convenience function: submit and wait for result
 * @param fileUrl - Public URL of the file to convert
 * @param options - Conversion options
 * @returns Converted document content
 */
export async function convertDocument(
  fileUrl: string,
  options: DatalabSubmitRequest = {
    output_format: 'markdown',
    disable_image_extraction: true,
    force_ocr: false,
    paginate: true,
  }
): Promise<{
  markdown: string | null;
  pageCount: number | null;
  status: 'complete' | 'failed';
}> {
  try {
    // Submit for conversion
    const submitResult = await submitDatalabConversion(fileUrl, options);

    if (!submitResult.success) {
      logger.error({ error: submitResult.error }, 'Submission failed');
      return {
        markdown: null,
        pageCount: null,
        status: 'failed',
      };
    }

    // Poll for result (15 attempts, 2 seconds apart = 30 seconds max)
    const result = await pollDatalabResult(submitResult.request_check_url, 15, 2000);

    if (result.status === 'complete' && result.success && result.markdown) {
      return {
        markdown: result.markdown,
        pageCount: result.page_count ?? null,
        status: 'complete',
      };
    } else {
      logger.warn({ status: result.status, error: result.error }, 'Conversion incomplete');
      return {
        markdown: null,
        pageCount: null,
        status: 'failed',
      };
    }
  } catch (err) {
    logger.error({ err }, 'Document conversion failed');
    return {
      markdown: null,
      pageCount: null,
      status: 'failed',
    };
  }
}
