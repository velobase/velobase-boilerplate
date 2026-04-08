import type { SupportActorType, SupportEventType } from "@prisma/client";

// ============================================================================
// Email Types
// ============================================================================

export interface ParsedEmail {
  messageId: string;
  inReplyTo?: string;
  references?: string;
  from: {
    address: string;
    name?: string;
  };
  to: string[];
  cc?: string[];
  subject: string;
  text?: string;
  html?: string;
  date: Date;
  uid: number;
}

export interface EmailMetadata {
  messageId: string;
  inReplyTo?: string;
  references?: string;
  cc?: string[];
}

// ============================================================================
// Draft Types
// ============================================================================

export interface DraftMetadata {
  proposedReply: string;
  proposedActions?: ProposedAction[];
  confidence: number;
  reasoning?: string;
}

export interface ProposedAction {
  tool: string;
  args: Record<string, unknown>;
  description: string;
}

// ============================================================================
// Action Types
// ============================================================================

export interface ActionMetadata {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  success: boolean;
  error?: string;
}

// ============================================================================
// Timeline Event
// ============================================================================

export interface TimelineEvent {
  ticketId: string;
  actor: SupportActorType;
  actorId?: string;
  type: SupportEventType;
  content?: string;
  metadata?: EmailMetadata | DraftMetadata | ActionMetadata | Record<string, unknown>;
}

// ============================================================================
// User Context (for AI)
// ============================================================================

export interface UserContext {
  userId: string;
  email: string;
  name?: string;
  createdAt: Date;
  
  // Subscription
  subscription?: {
    id: string;
    planName: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd?: Date;
  };
  
  // Credits
  credits?: {
    available: number;
    used: number;
  };
  
  // Recent orders
  recentOrders?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
  }[];
  
  // Stats
  stats?: {
    totalPaidCents: number;
    ordersCount: number;
    generatedVideosCount: number;
  };
}

// ============================================================================
// AI Classification
// ============================================================================

export type TicketCategory = 
  | "CANCEL"
  | "REFUND" 
  | "BILLING"
  | "BUG"
  | "HOWTO"
  | "OTHER";

export interface ClassificationResult {
  category: TicketCategory;
  confidence: number;
  sentiment: "positive" | "neutral" | "negative" | "angry";
  summary: string;
  needsHumanReview: boolean;
  reasoning: string;
}

// ============================================================================
// Lark Card
// ============================================================================

export interface LarkApprovalCardData {
  ticketId: string;
  userEmail: string;
  subject: string;
  category: TicketCategory;
  confidence: number;
  originalMessage: string;
  proposedReply: string;
  proposedActions?: ProposedAction[];
}

