/**
 * File processing utilities for chat attachments
 */

// Document MIME types that support Datalab conversion
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
  'text/markdown',
] as const;

/**
 * Check if file is a document that can be converted by Datalab
 */
export function isConvertibleDocument(mimeType?: string | null): boolean {
  if (!mimeType) return false;
  return DOCUMENT_MIME_TYPES.includes(mimeType as never);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename?: string | null): string {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1]?.toLowerCase() ?? '' : '';
}

/**
 * Build document prompt for AI with converted content
 */
export function buildDocumentPrompt(
  filename: string | null | undefined,
  mimeType: string | null | undefined,
  markdown: string,
  pageCount?: number | null
): string {
  const fileInfo = [
    `📄 **Document Uploaded**: ${filename ?? 'document'}`,
    mimeType ? `- File Type: ${mimeType}` : null,
    pageCount ? `- Pages: ${pageCount}` : null,
  ].filter(Boolean).join('\n');

  return `

---
${fileInfo}

**Document Content:**

${markdown}

---

Please answer my question based on the document content above.
`;
}

/**
 * Estimate token count (rough approximation)
 * 1 token ≈ 4 characters for English, ≈ 1.5 characters for Chinese
 */
export function estimateTokenCount(text: string): number {
  // Simple heuristic: average 2 chars per token
  return Math.ceil(text.length / 2);
}

/**
 * Truncate markdown content if too long
 * Note: We don't truncate by default (user can upload up to 200MB)
 * But this function is available if needed
 */
export function truncateMarkdown(
  markdown: string,
  maxTokens = 1000000 // Default 1M tokens (very large)
): { content: string; truncated: boolean } {
  const estimatedTokens = estimateTokenCount(markdown);
  
  if (estimatedTokens <= maxTokens) {
    return { content: markdown, truncated: false };
  }

  // Truncate to maxTokens (rough)
  const maxChars = maxTokens * 2;
  const truncated = markdown.slice(0, maxChars);
  
  return {
    content: truncated + '\n\n[... Document content is too long and has been truncated ...]',
    truncated: true,
  };
}

