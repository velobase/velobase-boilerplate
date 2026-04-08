/**
 * Support Agent - AI SDK v5 Agent 模式
 * 
 * 使用 generateText + tools 实现智能客服代理
 * - Read Tools (Query): 自动执行，用于收集信息
 * - Write Tools (Action): 返回特殊标记，由外部处理审批
 */

import { generateText, tool, stepCountIs } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { SUPPORT_SYSTEM_PROMPT } from "./prompts/system";
import {
  querySubscription,
  queryCredits,
  queryOrders,
  cancelSubscription,
  refundOrder,
  addBlurBypass,
  addCredits,
} from "./tools";
import type { UserContext } from "../types";
import { formatContextForPrompt } from "../services/get-context";

// OpenRouter client
const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY ?? "",
});

// 模型配置
const MODEL = "anthropic/claude-sonnet-4.5";

// Write Tool 返回的特殊标记
const APPROVAL_REQUIRED_MARKER = "__REQUIRES_APPROVAL__";

/**
 * Agent 结果类型
 */
export interface AgentResult {
  // 最终回复文本
  reply: string;
  // 已执行的工具调用
  executedTools: Array<{
    name: string;
    args: Record<string, unknown>;
    result: unknown;
  }>;
  // 待审批的工具调用
  pendingApprovals: Array<{
    approvalId: string;
    toolName: string;
    args: Record<string, unknown>;
    description: string;
  }>;
  // 是否需要人工审批
  needsApproval: boolean;
  // 原始步骤（用于保存到 Conversation）
  steps: unknown[];
  // 用于继续对话的消息数组
  messages: unknown[];
}

/**
 * 定义支持工具
 */
function createSupportTools(userId: string | null) {
  return {
    // ============ Read Tools (自动执行) ============
    // Note: 所有工具都需要至少一个参数，否则某些提供商（如 Anthropic via OpenRouter）
    // 不会返回 arguments 字段，导致 AI SDK 解析失败
    query_subscription: tool({
      description: "Query user's subscription status, including plan type, expiration date, and cancellation status",
      inputSchema: z.object({
        _dummy: z.boolean().optional().describe("Unused parameter"),
      }),
      execute: async () => {
        if (!userId) return { error: "User not found" };
        return querySubscription(userId);
      },
    }),

    query_credits: tool({
      description: "Query user's credit balance and usage statistics",
      inputSchema: z.object({
        _dummy: z.boolean().optional().describe("Unused parameter"),
      }),
      execute: async () => {
        if (!userId) return { error: "User not found" };
        return queryCredits(userId);
      },
    }),

    query_orders: tool({
      description: "Query user's order history",
      inputSchema: z.object({
        limit: z.number().optional().describe("Number of orders to return, default 10"),
      }),
      execute: async ({ limit }: { limit?: number }) => {
        if (!userId) return { error: "User not found" };
        return queryOrders(userId, limit ?? 10);
      },
    }),

    // ============ Write Tools (返回特殊标记，外部处理审批) ============
    cancel_subscription: tool({
      description: "Cancel user's subscription. Can choose to cancel immediately with prorated refund, or cancel at period end (no refund). REQUIRES APPROVAL - do not use this if you are unsure.",
      inputSchema: z.object({
        refund_remaining: z.boolean().optional().describe("Whether to refund remaining period. true=cancel immediately with refund, false=cancel at period end (default)"),
      }),
      execute: async ({ refund_remaining }: { refund_remaining?: boolean }) => {
        // 返回特殊标记，表示需要审批
        return {
          status: APPROVAL_REQUIRED_MARKER,
          tool: "cancel_subscription",
          args: { refund_remaining },
          message: "This action requires human approval before execution.",
        };
      },
    }),

    refund_order: tool({
      description: "Refund an order (for one-time purchases like credit packs). REQUIRES APPROVAL - do not use this if you are unsure.",
      inputSchema: z.object({
        order_id: z.string().optional().describe("Order ID to refund. If not provided, refunds the most recent successful order"),
        amount: z.number().optional().describe("Refund amount in cents. If not provided, full refund is issued"),
        reason: z.string().optional().describe("Reason for refund"),
      }),
      execute: async ({ order_id, amount, reason }: { order_id?: string; amount?: number; reason?: string }) => {
        return {
          status: APPROVAL_REQUIRED_MARKER,
          tool: "refund_order",
          args: { order_id, amount, reason },
          message: "This action requires human approval before execution.",
        };
      },
    }),

    add_blur_bypass: tool({
      description: "Add user to video blur paywall bypass allowlist. Use when user complains about seeing blur despite having purchased credits. REQUIRES APPROVAL.",
      inputSchema: z.object({
        _dummy: z.boolean().optional().describe("Unused parameter"),
      }),
      execute: async () => {
        return {
          status: APPROVAL_REQUIRED_MARKER,
          tool: "add_blur_bypass",
          args: {},
          message: "This action requires human approval before execution.",
        };
      },
    }),

    add_credits: tool({
      description: "Add bonus credits to user's account as compensation. Use for service issues, apologies, or goodwill gestures. Maximum 1000 credits. REQUIRES APPROVAL.",
      inputSchema: z.object({
        amount: z.number().describe("Number of credits to add (required, max 1000)"),
        reason: z.string().optional().describe("Reason for adding credits"),
      }),
      execute: async ({ amount, reason }: { amount: number; reason?: string }) => {
        return {
          status: APPROVAL_REQUIRED_MARKER,
          tool: "add_credits",
          args: { amount, reason },
          message: "This action requires human approval before execution.",
        };
      },
    }),
  };
}

/**
 * 运行 Support Agent
 */
export async function runSupportAgent(
  subject: string,
  body: string,
  context: UserContext | null,
  previousMessages?: unknown[],
): Promise<AgentResult> {
  const userId = context?.userId ?? null;
  const contextText = formatContextForPrompt(context);

  // 构建初始消息
  const systemMessage = SUPPORT_SYSTEM_PROMPT;
  const userPrompt = `
## Customer Email
Subject: ${subject}

Body:
${body}

## User Account Context
${contextText}

Please help this customer. First, gather any information you need using the query tools, then decide on the best course of action.
If you need to perform any sensitive action (cancel subscription, refund, add credits, etc.), use the appropriate tool.
Finally, compose a helpful reply email to the customer.
`;

  // 定义工具
  const tools = createSupportTools(userId);

  // 识别需要审批的工具
  const approvalRequiredTools = new Set([
    "cancel_subscription",
    "refund_order", 
    "add_blur_bypass",
    "add_credits",
  ]);

  try {
    const result = await generateText({
      model: openrouter(MODEL),
      system: systemMessage,
      messages: previousMessages as Parameters<typeof generateText>[0]["messages"] ?? [
        { role: "user", content: userPrompt },
      ],
      tools,
      toolChoice: "auto",
      // AI SDK v5 使用 stopWhen 替代 maxSteps
      stopWhen: stepCountIs(5),
    });

    // 解析结果
    const executedTools: AgentResult["executedTools"] = [];
    const pendingApprovals: AgentResult["pendingApprovals"] = [];

    // 遍历所有步骤
    for (const step of result.steps) {
      for (const toolCall of step.toolCalls) {
        const toolName = toolCall.toolName;
        // 使用类型断言获取 args
        const args = (toolCall as unknown as { args: Record<string, unknown> }).args ?? {};

        // 查找对应的 toolResult
        const toolResult = step.toolResults.find(
          (r) => r.toolCallId === toolCall.toolCallId
        );
        const resultData = toolResult 
          ? (toolResult as unknown as { result: unknown }).result 
          : undefined;

        if (approvalRequiredTools.has(toolName)) {
          // 这是一个需要审批的工具调用
          pendingApprovals.push({
            approvalId: toolCall.toolCallId,
            toolName,
            args,
            description: getToolDescription(toolName, args),
          });
        } else {
          // 这是一个已执行的查询工具
          executedTools.push({
            name: toolName,
            args,
            result: resultData,
          });
        }
      }
    }

    logger.info(
      {
        executedToolsCount: executedTools.length,
        pendingApprovalsCount: pendingApprovals.length,
        textLength: result.text.length,
      },
      "Support agent completed"
    );

    return {
      reply: result.text,
      executedTools,
      pendingApprovals,
      needsApproval: pendingApprovals.length > 0,
      steps: result.steps,
      messages: result.response.messages,
    };
  } catch (err) {
    logger.error({ err }, "Support agent failed");

    return {
      reply: "",
      executedTools: [],
      pendingApprovals: [],
      needsApproval: true, // 出错时需要人工处理
      steps: [],
      messages: [],
    };
  }
}

/**
 * 继续执行已审批的工具调用
 */
export async function continueWithApproval(
  conversationMessages: unknown[],
  approvedTools: Array<{ toolName: string; args: Record<string, unknown> }>,
  userId: string,
): Promise<AgentResult> {
  // 执行已审批的工具
  const toolResults: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = [];

  for (const approvedTool of approvedTools) {
    let result: unknown;
    
    switch (approvedTool.toolName) {
      case "cancel_subscription":
        result = await cancelSubscription(userId, {
          refundRemaining: approvedTool.args.refund_remaining === true,
        });
        break;
      case "refund_order":
        result = await refundOrder(userId, {
          orderId: approvedTool.args.order_id as string | undefined,
          amount: approvedTool.args.amount as number | undefined,
          reason: approvedTool.args.reason as string | undefined,
        });
        break;
      case "add_blur_bypass":
        result = await addBlurBypass(userId);
        break;
      case "add_credits":
        result = await addCredits(userId, {
          amount: approvedTool.args.amount as number,
          reason: approvedTool.args.reason as string | undefined,
        });
        break;
      default:
        result = { error: `Unknown tool: ${approvedTool.toolName}` };
    }

    toolResults.push({
      name: approvedTool.toolName,
      args: approvedTool.args,
      result,
    });
  }

  return {
    reply: "", // 继续执行后不需要新回复
    executedTools: toolResults,
    pendingApprovals: [],
    needsApproval: false,
    steps: [],
    messages: conversationMessages,
  };
}

/**
 * 获取工具调用的人类可读描述
 */
function getToolDescription(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "cancel_subscription":
      return args.refund_remaining 
        ? "Cancel subscription immediately with prorated refund"
        : "Cancel subscription at period end (no refund)";
    case "refund_order":
      return args.amount
        ? `Refund ${(args.amount as number) / 100} USD`
        : "Full refund of most recent order";
    case "add_blur_bypass":
      return "Add user to blur bypass allowlist";
    case "add_credits":
      return `Add ${String(args.amount)} credits as compensation`;
    default:
      return `Execute ${toolName}`;
  }
}
