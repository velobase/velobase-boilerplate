/**
 * Simplified token pricing configuration
 * Pure token-based billing without base fees or thresholds
 * 
 * Premium user credit price: $0.000125/credit (400K credits for $50)
 * 
 * Cost basis:
 * - Claude 3.5 Sonnet: $1.25/M input, $10/M output
 * - GPT-4o similar pricing
 * - Reasoning models (o1/o3): ~$5/M input, ~$15/M output (estimated)
 */

export type ModelTier = 'ADVANCED' | 'REASONING';

interface TokenPricing {
  input: number;  // credits per 1K input tokens
  output: number; // credits per 1K output tokens
}

/**
 * Token pricing table (credits per 1K tokens)
 * 
 * Calculated based on Premium credit price: $0.000125/credit
 * Includes 25-30% profit margin above break-even
 */
export const TOKEN_PRICING: Record<ModelTier, TokenPricing> = {
  ADVANCED: { 
    input: 13,   // Break-even: 10, with 30% margin = 13 credits/1K
    output: 100  // Break-even: 80, with 25% margin = 100 credits/1K  
  },  // Models: GPT-4o, Claude 3.5 Sonnet, Gemini 1.5 Pro
  
  REASONING: { 
    input: 50,   // Break-even: 40, with 25% margin = 50 credits/1K
    output: 150  // Break-even: 120, with 25% margin = 150 credits/1K
  },  // Models: o1, o1-mini, o3, o3-mini (higher cost reasoning models)
};

/**
 * Determine if a model is a reasoning model
 */
function isReasoningModel(modelId: string): boolean {
  const modelLower = modelId.toLowerCase();
  return (
    modelLower.includes('o1') ||
    modelLower.includes('o3-mini') ||
    modelLower.includes('o3')
  );
}

/**
 * Get pricing tier for a specific model
 */
export function getModelPricing(modelId: string): TokenPricing {
  if (isReasoningModel(modelId)) {
    return TOKEN_PRICING.REASONING;
  }
  return TOKEN_PRICING.ADVANCED; // Default to advanced model pricing
}

/**
 * Determine model tier from model ID (for logging/analytics)
 */
export function determineModelTier(modelId: string): ModelTier {
  return isReasoningModel(modelId) ? 'REASONING' : 'ADVANCED';
}

/**
 * Calculate total chat cost (pure token billing)
 * 
 * @param modelId - Model identifier (e.g., "gpt-4o", "claude-3-5-sonnet")
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Total credits to charge (minimum 1 credit to prevent abuse)
 */
export function calculateChatCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(modelId);
  
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;
  
  // Minimum 1 credit per turn (prevent abuse)
  return Math.max(Math.ceil(totalCost), 1);
}

