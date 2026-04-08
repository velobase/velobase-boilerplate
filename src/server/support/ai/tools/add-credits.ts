/**
 * Add Credits Tool
 * 
 * Grant bonus credits to a user as compensation for issues
 */

import { logger } from "@/lib/logger";
import { grant } from "@/server/billing/services/grant";

export interface AddCreditsOptions {
  /** Amount of credits to add (must be positive) */
  amount: number;
  /** Reason for adding credits */
  reason?: string;
}

export interface AddCreditsResult {
  success: boolean;
  message: string;
  amount?: number;
  error?: string;
}

/**
 * Add credits to a user's account as compensation
 * 
 * @param userId - User ID
 * @param options - Options including amount and reason
 * @returns Result of the operation
 */
export async function addCredits(
  userId: string,
  options: AddCreditsOptions
): Promise<AddCreditsResult> {
  const { amount, reason = "Customer support compensation" } = options;

  // Validate amount
  if (!amount || amount <= 0) {
    return {
      success: false,
      message: "Amount must be a positive number",
      error: "INVALID_AMOUNT",
    };
  }

  // Cap at 1000 credits for safety (can be adjusted)
  if (amount > 1000) {
    return {
      success: false,
      message: "Amount exceeds maximum allowed (1000 credits). Please escalate to a human agent.",
      error: "AMOUNT_TOO_LARGE",
    };
  }

  try {
    const result = await grant({
      userId,
      accountType: "CREDIT",
      subAccountType: "DEFAULT",
      amount,
      outerBizId: `support_grant_${userId}_${Date.now()}`,
      businessType: "ADMIN_GRANT", // Using same type as admin for consistency
      description: `[AI Support] ${reason}`,
    });

    logger.info(
      {
        userId,
        amount,
        reason,
        accountId: result.accountId,
        recordId: result.recordId,
      },
      "Credits granted via AI support"
    );

    return {
      success: true,
      message: `Successfully added ${amount} credits to the user's account.`,
      amount,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ err, userId, amount }, "Failed to add credits");

    return {
      success: false,
      message: "Failed to add credits to user account",
      error: errorMessage,
    };
  }
}

