export { findOrCreateTicket, isEmailProcessed } from "./find-or-create-ticket";
export { addEvent, addDraftEvent, addActionEvent, addSystemEvent, addNoteEvent } from "./add-event";
export { updateTicketStatus, escalateToHuman, markAsSolved, markAsWaiting } from "./update-status";
export { getUserContext, getUserContextByEmail, formatContextForPrompt } from "./get-context";
export { approveDraft, rejectDraft, getPendingApprovalTickets } from "./approve-draft";
export { 
  getOrCreateConversation, 
  loadConversationHistory, 
  saveUserMessage, 
  saveAIMessage,
  saveAgentSteps,
} from "./conversation";

