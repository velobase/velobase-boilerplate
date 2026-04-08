/**
 * Tool Context - passed to tool factories
 */
export interface ToolContext {
  projectId?: string;
  userId?: string;
  conversationId?: string;
  [key: string]: unknown;
}

/**
 * Tool Factory - creates tool instances based on context
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolFactory = (context?: ToolContext) => any;

/**
 * Tool Configuration for registry
 */
export interface ToolConfig {
  name: string;
  description: string;
  factory: ToolFactory;
}

