// AI Chat Module - Components

// Chat components
export { ChatHeader } from "./chat/chat-header";
export { ChatPanel } from "./chat/chat-panel";
export { ScrollableMessageList } from "./chat/scrollable-message-list";
export { MessageListSkeleton } from "./chat/message-list-skeleton";
export { ErrorMessage } from "./chat/error-message";
export { ChatInput, type AttachmentData } from "./chat/chat-input";
export { WelcomeView } from "./chat/welcome-view";
export { EmptyConversationView } from "./chat/empty-conversation-view";
export { AttachmentPreview } from "./chat/attachment-preview";
export { CircularProgress } from "./chat/circular-progress";
export { StartPanel } from "./chat/start-panel";

// Message components
export { UserMessage } from "./messages/user-message";
export { AssistantMessage } from "./messages/assistant-message";

// Message blocks
export { TextBlock } from "./messages/blocks/TextBlock";
export { ToolBlock } from "./messages/blocks/ToolBlock";
export { ReasoningBlock } from "./messages/blocks/ReasoningBlock";

// Tool renderer registry
export { registerToolRenderer, getToolRenderer } from "./messages/blocks/tools/registry";

