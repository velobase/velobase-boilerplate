/**
 * AI Chat Module - Main Entry Point
 * 
 * This is the main entry point for the AI Chat module.
 * Import what you need from this file to integrate the chat functionality.
 */

// NOTE: setup-renderers.ts must be imported from a client component
// (e.g., layout.tsx or a client-side provider) NOT from server code.

// Types
export type {
  ChatUIMessage,
  MessageMetadata,
} from "./types/message";

export type {
  InteractionType,
  InteractionTypeValue,
  DocumentProcessingData,
  DocumentProcessingPart,
  InteractionRecord,
} from "./types/interaction";

export type {
  ToolContext,
  ToolFactory,
  ToolConfig,
} from "./types/tool";

// Components
export {
  ChatPanel,
  StartPanel,
  ScrollableMessageList,
  ErrorMessage,
  UserMessage,
  AssistantMessage,
  TextBlock,
  ToolBlock,
  ReasoningBlock,
  registerToolRenderer,
  getToolRenderer,
  ChatInput,
  WelcomeView,
  EmptyConversationView,
} from "./components";

// Hooks
export {
  useConversation,
  type UseConversationOptions,
  type UseConversationReturn,
} from "./hooks";

// Server - Services
export {
  createUserMessageInteraction,
  createAIMessageInteraction,
  createDocumentProcessingInteraction,
  loadConversationInteractions,
  loadUIInteractions,
  findDocumentProcessingByCorrelation,
} from "./server/services/interaction.service";

export {
  buildUIProjection,
  buildAIProjection,
} from "./server/services/projection.service";

export {
  generateConversationTitle,
  extractTextFromMessage,
} from "./server/services/title-generation.service";

// Server - Tools
export {
  toolRegistry,
} from "@/server/api/tools/registry";

// Server - Lib
export { filterUnsupportedToolCalls } from "./server/lib/message-utils";

