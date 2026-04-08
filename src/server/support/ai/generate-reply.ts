/**
 * AI 回复生成器
 */

import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { SUPPORT_SYSTEM_PROMPT, REPLY_GENERATION_PROMPT } from "./prompts/system";
import { formatContextForPrompt } from "../services/get-context";
import type { UserContext, ProposedAction } from "../types";

// OpenRouter client (使用 Claude claude-sonnet-4.5)
const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY ?? "",
});

const ReplySchema = z.object({
  reply: z.string(),
  actions: z.array(
    z.object({
      tool: z.string(),
      args: z.record(z.unknown()),
      description: z.string(),
    })
  ),
  confidence: z.number().min(0).max(1),
  needsApproval: z.boolean(),
  reasoning: z.string(),
});

export interface GenerateReplyResult {
  reply: string;
  actions: ProposedAction[];
  confidence: number;
  needsApproval: boolean;
  reasoning: string;
}

/**
 * 生成回复
 */
export async function generateReply(
  subject: string,
  body: string,
  context: UserContext | null,
  previousMessages?: string[]
): Promise<GenerateReplyResult> {
  try {
    const contextText = formatContextForPrompt(context);

    const prompt = `
## Customer Email
Subject: ${subject}

Body:
${body}

## User Account Context
${contextText}

${
  previousMessages && previousMessages.length > 0
    ? `## Previous Messages in Thread
${previousMessages.join("\n---\n")}`
    : ""
}

Please generate a helpful reply.
`;

    const { object } = await generateObject({
      model: openrouter("anthropic/claude-sonnet-4.5"),
      schema: ReplySchema,
      system: `${SUPPORT_SYSTEM_PROMPT}\n\n${REPLY_GENERATION_PROMPT}`,
      prompt,
    });

    logger.info(
      {
        confidence: object.confidence,
        needsApproval: object.needsApproval,
        actionsCount: object.actions.length,
      },
      "Reply generated"
    );

    return {
      reply: object.reply,
      actions: object.actions as ProposedAction[],
      confidence: object.confidence,
      needsApproval: object.needsApproval,
      reasoning: object.reasoning,
    };
  } catch (err) {
    logger.error({ err }, "Failed to generate reply");

    // 生成失败时返回需要人工处理的结果
    return {
      reply: "",
      actions: [],
      confidence: 0,
      needsApproval: true,
      reasoning: "AI generation failed, needs human review",
    };
  }
}

/**
 * 生成简单的确认回复（不需要 AI）
 */
export function generateSimpleReply(
  type: "cancel_confirmed" | "subscription_status" | "credits_balance",
  data: Record<string, unknown>
): string {
  // Helper to safely convert unknown to string
  const str = (val: unknown, fallback: string): string => {
    if (val == null) return fallback;
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    return JSON.stringify(val);
  };

  switch (type) {
    case "cancel_confirmed":
      return `Hi,

Thank you for reaching out!

I've cancelled your subscription for you. You won't be charged again when your current billing cycle ends.

Your subscription will remain active until ${str(data.endDate, "the end of your current period")}, so you can continue using all features until then.

If you have any other questions, feel free to reply to this email.

Best regards,
The Support Team`;

    case "subscription_status":
      return `Hi,

Here's your current subscription status:

- Plan: ${str(data.planName, "N/A")}
- Status: ${str(data.status, "N/A")}
- Credits available: ${str(data.credits, "N/A")}
${data.periodEnd ? `- Current period ends: ${str(data.periodEnd, "")}` : ""}

If you have any questions about your subscription, feel free to ask!

Best regards,
The Support Team`;

    case "credits_balance":
      return `Hi,

Your current credits balance is: ${str(data.credits, "0")} credits

${data.subscription ? "As a subscriber, your credits refresh every month." : "You can purchase more credits anytime from your dashboard."}

If you need any help, just let me know!

Best regards,
The Support Team`;

    default:
      return "";
  }
}

