/**
 * AI Tools Registry
 */

import { logger } from "@/lib/logger";
import { cancelSubscription, type CancelSubscriptionResult, type CancelSubscriptionOptions } from "./cancel-subscription";
import { querySubscription, type SubscriptionInfo } from "./query-subscription";
import { queryCredits, type CreditsInfo } from "./query-credits";
import { queryOrders, type OrdersResult } from "./query-orders";
import { refundOrder, type RefundOrderResult, type RefundOrderOptions } from "./refund-order";
import { addBlurBypass, type AddBlurBypassResult } from "./add-blur-bypass";
import { addCredits, type AddCreditsResult, type AddCreditsOptions } from "./add-credits";

export type ToolName = 
  | "cancel_subscription"
  | "query_subscription"
  | "query_credits"
  | "query_orders"
  | "refund_order"
  | "add_blur_bypass"
  | "add_credits";

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

/**
 * Tool definitions (for AI SDK)
 */
export const toolDefinitions = {
  query_subscription: {
    description: "Query user's subscription status, including plan type, expiration date, and cancellation status",
    parameters: {},
  },
  query_credits: {
    description: "Query user's credit balance and usage statistics",
    parameters: {},
  },
  query_orders: {
    description: "Query user's order history",
    parameters: {
      limit: {
        type: "number",
        description: "Number of orders to return, default 10",
        optional: true,
      },
    },
  },
  cancel_subscription: {
    description: "Cancel user's subscription. Can choose to cancel immediately with prorated refund, or cancel at period end (no refund)",
    parameters: {
      refund_remaining: {
        type: "boolean",
        description: "Whether to refund remaining period. true=cancel immediately with refund, false=cancel at period end (default)",
        optional: true,
      },
    },
  },
  refund_order: {
    description: "Refund an order (for one-time purchases like credit packs). Can specify order or auto-select most recent",
    parameters: {
      order_id: {
        type: "string",
        description: "Order ID to refund. If not provided, refunds the most recent successful order",
        optional: true,
      },
      amount: {
        type: "number",
        description: "Refund amount in cents. If not provided, full refund is issued",
        optional: true,
      },
      reason: {
        type: "string",
        description: "Reason for refund",
        optional: true,
      },
    },
  },
  add_blur_bypass: {
    description: "Add user to video blur paywall bypass allowlist. Use when user complains about seeing blur despite having purchased credits. After adding, user will no longer see the blur paywall",
    parameters: {},
  },
  add_credits: {
    description: "Add bonus credits to user's account as compensation. Use for service issues, apologies, or goodwill gestures. Maximum 1000 credits per operation",
    parameters: {
      amount: {
        type: "number",
        description: "Number of credits to add (required, max 1000)",
        optional: false,
      },
      reason: {
        type: "string",
        description: "Reason for adding credits (e.g., 'Compensation for service disruption')",
        optional: true,
      },
    },
  },
};

/**
 * Execute a tool
 */
export async function executeTool(
  toolName: ToolName,
  userId: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  logger.info({ toolName, userId, args }, "Executing support tool");

  try {
    switch (toolName) {
      case "cancel_subscription": {
        const options: CancelSubscriptionOptions = {
          refundRemaining: args.refund_remaining === true,
        };
        const result = await cancelSubscription(userId, options);
        return {
          success: result.success,
          data: result,
          error: result.error,
        };
      }

      case "query_subscription": {
        const result = await querySubscription(userId);
        return {
          success: true,
          data: result,
        };
      }

      case "query_credits": {
        const result = await queryCredits(userId);
        return {
          success: true,
          data: result,
        };
      }

      case "query_orders": {
        const limit = typeof args.limit === "number" ? args.limit : 10;
        const result = await queryOrders(userId, limit);
        return {
          success: true,
          data: result,
        };
      }

      case "refund_order": {
        const options: RefundOrderOptions = {
          orderId: typeof args.order_id === "string" ? args.order_id : undefined,
          amount: typeof args.amount === "number" ? args.amount : undefined,
          reason: typeof args.reason === "string" ? args.reason : undefined,
        };
        const result = await refundOrder(userId, options);
        return {
          success: result.success,
          data: result,
          error: result.error,
        };
      }

      case "add_blur_bypass": {
        const result = await addBlurBypass(userId);
        return {
          success: result.success,
          data: result,
          error: result.error,
        };
      }

      case "add_credits": {
        const options: AddCreditsOptions = {
          amount: typeof args.amount === "number" ? args.amount : 0,
          reason: typeof args.reason === "string" ? args.reason : undefined,
        };
        const result = await addCredits(userId, options);
        return {
          success: result.success,
          data: result,
          error: result.error,
        };
      }

      default:
        return {
          success: false,
          data: null,
          error: `Unknown tool: ${toolName as string}`,
        };
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err, toolName, userId }, "Tool execution failed");

    return {
      success: false,
      data: null,
      error: errorMessage,
    };
  }
}

export {
  cancelSubscription,
  querySubscription,
  queryCredits,
  queryOrders,
  refundOrder,
  addBlurBypass,
  addCredits,
  type CancelSubscriptionResult,
  type CancelSubscriptionOptions,
  type SubscriptionInfo,
  type CreditsInfo,
  type OrdersResult,
  type RefundOrderResult,
  type RefundOrderOptions,
  type AddBlurBypassResult,
  type AddCreditsResult,
  type AddCreditsOptions,
};
