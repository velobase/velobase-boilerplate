/**
 * AI 分类器 - 分析客户邮件意图
 */

import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { CLASSIFICATION_PROMPT } from "./prompts/system";
import type { ClassificationResult, TicketCategory } from "../types";

// OpenRouter client (使用 Claude claude-sonnet-4.5)
const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY ?? "",
});

const ClassificationSchema = z.object({
  category: z.enum(["CANCEL", "REFUND", "BILLING", "BUG", "HOWTO", "OTHER"]),
  confidence: z.number().min(0).max(1),
  sentiment: z.enum(["positive", "neutral", "negative", "angry"]),
  summary: z.string(),
  needsHumanReview: z.boolean(),
  reasoning: z.string(),
});

/**
 * 分类客户邮件
 */
export async function classifyEmail(
  subject: string,
  body: string
): Promise<ClassificationResult> {
  try {
    const { object } = await generateObject({
      model: openrouter("anthropic/claude-sonnet-4.5"),
      schema: ClassificationSchema,
      system: CLASSIFICATION_PROMPT,
      prompt: `Subject: ${subject}\n\nBody:\n${body}`,
    });

    logger.info(
      {
        category: object.category,
        confidence: object.confidence,
        sentiment: object.sentiment,
      },
      "Email classified"
    );

    return object as ClassificationResult;
  } catch (err) {
    logger.error({ err }, "Failed to classify email");

    // 默认返回需要人工审核
    return {
      category: "OTHER",
      confidence: 0,
      sentiment: "neutral",
      summary: "Classification failed",
      needsHumanReview: true,
      reasoning: "AI classification failed, needs human review",
    };
  }
}

/**
 * 快速分类（仅返回分类，不做完整分析）
 */
export async function quickClassify(text: string): Promise<TicketCategory> {
  // 关键词匹配快速分类
  const lowerText = text.toLowerCase();

  if (lowerText.includes("cancel") || lowerText.includes("unsubscribe")) {
    return "CANCEL";
  }
  if (lowerText.includes("refund") || lowerText.includes("money back")) {
    return "REFUND";
  }
  if (
    lowerText.includes("charge") ||
    lowerText.includes("bill") ||
    lowerText.includes("payment") ||
    lowerText.includes("invoice")
  ) {
    return "BILLING";
  }
  if (
    lowerText.includes("bug") ||
    lowerText.includes("error") ||
    lowerText.includes("not working") ||
    lowerText.includes("broken")
  ) {
    return "BUG";
  }
  if (
    lowerText.includes("how to") ||
    lowerText.includes("how do i") ||
    lowerText.includes("help me")
  ) {
    return "HOWTO";
  }

  return "OTHER";
}

