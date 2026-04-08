import { z } from "zod";

/**
 * Chat API request body schema
 */
export const chatRequestSchema = z.object({
  // Trigger type (Vercel AI SDK standard)
  trigger: z.enum(['submit-message', 'regenerate-message']).optional().default('submit-message'),
  
  // Conversation ID (required)
  id: z.string().min(1, "Conversation ID is required"),
  
  // Messages array (for SDK compatibility)
  messages: z.array(z.unknown()).optional(),
  
  // Message payload (for submit-message)
  message: z.unknown().optional(),
  
  // Message ID (for regenerate-message or edit)
  messageId: z.string().optional(),
  
  // Parent ID (for branch selection)
  parentId: z.string().optional(),
  
  // Auth/agent context
  userAgentId: z.string().optional(),
  agentId: z.string().optional(),
  guestId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * Validate and parse chat request
 */
export function validateChatRequest(body: unknown): ChatRequest {
  return chatRequestSchema.parse(body);
}

/**
 * Validate trigger-specific requirements
 */
export function validateTriggerRequirements(request: ChatRequest): void {
  if (request.trigger === 'regenerate-message' && !request.messageId) {
    throw new Error('messageId required for regenerate-message');
  }
  
  if (request.trigger === 'submit-message' && !request.message) {
    throw new Error('message required for submit-message');
  }
}

