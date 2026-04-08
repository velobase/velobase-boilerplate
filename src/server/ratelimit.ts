/**
 * Rate Limiting & Concurrency Control
 * 
 * This module provides:
 * 1. User-level rate limiting (requests per minute) based on subscription tier
 * 2. IP-level rate limiting (fallback for anonymous/malicious traffic)
 * 3. Concurrency gate (max simultaneous operations per user)
 */

import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from './redis';
import { GUEST_MODE_CONFIG } from '@/config/guest-mode';

// =============================================================================
// User-level Rate Limiters (differentiated by subscription tier)
// =============================================================================

/**
 * Free tier: 20 requests per minute
 * - Sliding window algorithm for smooth rate limiting
 * - Immediate rejection when limit exceeded (no blocking)
 */
export const userRateLimiterFree = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:user:free',
  points: 20,        // 20 requests
  duration: 60,      // per 60 seconds (1 minute)
  blockDuration: 0,  // Don't block, reject immediately
});

/**
 * Plus/Premium tier: 120 requests per minute
 * - Higher throughput for paid users
 */
export const userRateLimiterPlus = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:user:plus',
  points: 120,       // 120 requests
  duration: 60,      // per 60 seconds
  blockDuration: 0,
});

/**
 * Get appropriate rate limiter based on user tier
 */
export function getUserRateLimiter(tier: 'FREE' | 'PLUS' | 'PREMIUM') {
  return tier === 'FREE' ? userRateLimiterFree : userRateLimiterPlus;
}

// =============================================================================
// IP-level Rate Limiter (fallback for unauthenticated requests)
// =============================================================================

/**
 * IP-level: 300 requests per minute
 * - Prevents abuse from single IP (scraping, brute force, etc.)
 * - Applied to all requests regardless of authentication
 */
export const ipRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:ip',
  points: 300,       // 300 requests
  duration: 60,      // per 60 seconds
  blockDuration: 0,
});

// =============================================================================
// Guest-specific Rate Limiters
// =============================================================================

/**
 * Guest ID-level rate limiter
 * - Primary limit for guest users (tracked by localStorage guestId)
 * - Prevents unlimited usage by refreshing the page
 * - Configuration: GUEST_MODE_CONFIG.MAX_MESSAGES_PER_GUEST_ID_PER_DAY
 */
export const guestIdRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:guest:id',
  points: GUEST_MODE_CONFIG.MAX_MESSAGES_PER_GUEST_ID_PER_DAY,
  duration: GUEST_MODE_CONFIG.RATE_LIMIT_WINDOW_SECONDS,
  blockDuration: 0,
});

/**
 * Guest IP-level rate limiter
 * - Secondary limit to prevent abuse by clearing localStorage
 * - More lenient than guestId limit to allow multiple devices
 * - Configuration: GUEST_MODE_CONFIG.MAX_MESSAGES_PER_IP_PER_DAY
 */
export const guestIpRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:guest:ip',
  points: GUEST_MODE_CONFIG.MAX_MESSAGES_PER_IP_PER_DAY,
  duration: GUEST_MODE_CONFIG.RATE_LIMIT_WINDOW_SECONDS,
  blockDuration: 0,
});

// =============================================================================
// Concurrency Gate (max simultaneous operations)
// =============================================================================

/**
 * Acquire a concurrency slot for a user
 * 
 * @param userId - User ID
 * @param maxConcurrent - Maximum allowed concurrent operations
 * @returns true if slot acquired, false if limit reached
 * 
 * @example
 * const acquired = await acquireChatSlot(userId, 3);
 * if (!acquired) {
 *   throw new Error('Too many concurrent chats');
 * }
 */
export async function acquireChatSlot(userId: string, maxConcurrent: number): Promise<boolean> {
  const key = `conc:chat:${userId}`;
  
  // Atomically increment and check
  const current = await redis.incr(key);
  
  // Set TTL to prevent slot leakage (5 minutes auto-cleanup)
  await redis.expire(key, 300);
  
  // Check if within limit
  if (current > maxConcurrent) {
    // Exceeded limit, rollback increment
    await redis.decr(key);
    return false;
  }
  
  return true;
}

/**
 * Release a concurrency slot for a user
 * 
 * Should be called in finally block to ensure cleanup even on errors
 * 
 * @param userId - User ID
 * 
 * @example
 * try {
 *   await doWork();
 * } finally {
 *   await releaseChatSlot(userId);
 * }
 */
export async function releaseChatSlot(userId: string): Promise<void> {
  const key = `conc:chat:${userId}`;
  const current = await redis.decr(key);
  
  // Cleanup: delete key if count reaches 0 (optional optimization)
  if (current <= 0) {
    await redis.del(key);
  }
}

/**
 * Get current concurrency count for a user
 * Useful for debugging and monitoring
 */
export async function getChatSlotCount(userId: string): Promise<number> {
  const key = `conc:chat:${userId}`;
  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
}

// =============================================================================
// Auth Rate Limiters (for email login / magic link)
// =============================================================================

/**
 * Email-based rate limiter: 3 attempts per hour per email
 * - Prevents email bombing attacks (sending spam to victim's inbox)
 * - Limits magic link requests per email address
 */
export const authEmailRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:auth:email',
  points: 3,           // 3 requests
  duration: 60 * 60,   // per 1 hour
  blockDuration: 0,
});

/**
 * IP-based auth rate limiter: 10 attempts per hour per IP
 * - Prevents enumeration attacks (testing many emails from one IP)
 * - More lenient than email limiter to allow multiple users behind NAT
 */
export const authIpRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:auth:ip',
  points: 10,          // 10 requests
  duration: 60 * 60,   // per 1 hour
  blockDuration: 0,
});

/**
 * Check auth rate limits for email login
 * @returns { allowed: true } or { allowed: false, retryAfter: seconds }
 */
export async function checkAuthRateLimit(
  email: string,
  ip: string
): Promise<{ allowed: true } | { allowed: false; retryAfter: number; reason: 'email' | 'ip' }> {
  // Normalize email to lowercase
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check email rate limit first
    await authEmailRateLimiter.consume(normalizedEmail);
  } catch (rejection) {
    return {
      allowed: false,
      retryAfter: getRetryAfterSeconds(rejection),
      reason: 'email',
    };
  }

  try {
    // Then check IP rate limit
    await authIpRateLimiter.consume(ip);
  } catch (rejection) {
    return {
      allowed: false,
      retryAfter: getRetryAfterSeconds(rejection),
      reason: 'ip',
    };
  }

  return { allowed: true };
}

// =============================================================================
// Rate Limit Error Handling Utilities
// =============================================================================

export interface RateLimitRejection {
  msBeforeNext: number;
  remainingPoints: number;
}

/**
 * Calculate retry-after duration from rate limit rejection
 */
export function getRetryAfterSeconds(rejection: unknown): number {
  const rejRes = rejection as RateLimitRejection;
  return Math.ceil((rejRes?.msBeforeNext ?? 60000) / 1000);
}

/**
 * Format user-friendly rate limit error message
 */
export function formatRateLimitMessage(tier: string, retryAfter: number): string {
  return `Rate limit exceeded for ${tier} tier. Please retry after ${retryAfter} second(s).`;
}

