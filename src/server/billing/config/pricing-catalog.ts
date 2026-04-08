/**
 * Unified pricing catalog for token-based billing
 * All rates are in credits per 1K tokens
 */

export type ModelTier = 'STANDARD' | 'ADVANCED' | 'REASONING';
export type UserTier = 'FREE' | 'PLUS' | 'PREMIUM';

interface TokenPricing {
  input: number;  // credits per 1K input tokens
  output: number; // credits per 1K output tokens
}

/**
 * Token pricing by model tier and user tier
 * Based on internal pricing table (docs/PRICING_INTERNAL_TABLE_V1.md)
 */
export const TOKEN_PRICING: Record<ModelTier, Record<UserTier, TokenPricing>> = {
  STANDARD: {
    FREE: { input: 0, output: 0 },      // Included in base fee
    PLUS: { input: 0, output: 0 },      // Included in base fee
    PREMIUM: { input: 0, output: 0 },   // Included in base fee
  },
  ADVANCED: {
    FREE: { input: 20, output: 60 },    // GPT-4o, Claude 3.5 Sonnet
    PLUS: { input: 20, output: 60 },
    PREMIUM: { input: 20, output: 60 },
  },
  REASONING: {
    FREE: { input: 40, output: 120 },   // o1, o3-mini
    PLUS: { input: 40, output: 120 },
    PREMIUM: { input: 40, output: 120 },
  },
};

interface CalculateTokenCostParams {
  modelTier: ModelTier;
  userTier: UserTier;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Calculate token usage cost based on model tier and user tier
 * Returns total credits to charge (rounded up to nearest integer)
 */
export function calculateTokenCost(params: CalculateTokenCostParams): number {
  const pricing = TOKEN_PRICING[params.modelTier][params.userTier];
  
  // Calculate cost per token type (per 1K tokens)
  const inputCost = (params.inputTokens / 1000) * pricing.input;
  const outputCost = (params.outputTokens / 1000) * pricing.output;
  
  // Round up to avoid fractional credits
  return Math.ceil(inputCost + outputCost);
}

/**
 * Determine model tier from model ID
 */
export function determineModelTier(modelId: string): ModelTier {
  const modelLower = modelId.toLowerCase();
  
  // Reasoning models (highest tier)
  if (
    modelLower.includes('o1') ||
    modelLower.includes('o3-mini') ||
    modelLower.includes('o3')
  ) {
    return 'REASONING';
  }
  
  // Advanced models
  if (
    // GPT-4o (but not mini)
    (modelLower.includes('gpt-4o') && !modelLower.includes('mini')) ||
    modelLower.includes('gpt-4-turbo') ||
    // Claude 3.5 Sonnet / Opus
    modelLower.includes('claude-3-5-sonnet') ||
    modelLower.includes('claude-3-opus') ||
    // Gemini Pro
    modelLower.includes('gemini-1.5-pro')
  ) {
    return 'ADVANCED';
  }
  
  // Standard models (default)
  // GPT-4o-mini, GPT-3.5, Claude Haiku, Gemini Flash, etc.
  return 'STANDARD';
}

