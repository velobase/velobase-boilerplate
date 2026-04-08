/**
 * Redis-backed short token for Telegram deep link binding.
 *
 * Telegram deep links have a 64-character limit on the `start` parameter.
 * We store { userId } or { userId, productId } in Redis keyed by a short
 * random token (8 chars), with a 15-minute TTL. The token is consumed
 * (deleted) on first successful verification.
 *
 * Token format examples:
 *   bind_AbCdEfGh   (13 chars total — well under 64 limit)
 *   bp_AbCdEfGh     (11 chars total)
 */

import crypto from "crypto";
import { redis } from "@/server/redis";

const TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const TOKEN_BYTES = 6; // 6 bytes → 8 base64url chars

const BIND_PREFIX = "tg:bind:";
const BIND_PAY_PREFIX = "tg:bp:";

function generateShortId(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url"); // 8 chars
}

// ─── Bind Token ──────────────────────────────────────────────────────────

/**
 * Create a short binding token stored in Redis.
 * Returns a short random string (8 chars) to be used in the deep link.
 */
export async function createBindingToken(userId: string): Promise<string> {
  const id = generateShortId();
  await redis.setex(`${BIND_PREFIX}${id}`, TOKEN_TTL_SECONDS, userId);
  return id;
}

/**
 * Verify and consume a binding token.
 * Returns the userId if valid, or null if invalid/expired.
 * Token is deleted after successful verification (one-time use).
 */
export async function verifyBindingToken(token: string): Promise<string | null> {
  const key = `${BIND_PREFIX}${token}`;
  // GET + DEL atomically via pipeline
  const pipeline = redis.pipeline();
  pipeline.get(key);
  pipeline.del(key);
  const results = await pipeline.exec();

  // results: [[err, value], [err, delCount]]
  const userId = results?.[0]?.[1] as string | null;
  return userId ?? null;
}

// ─── Bind + Pay Token ──────────────────────────────────────────────────────

/**
 * Create a short token that maps to both userId and productId.
 * Used for the combined "bind account + buy product" flow.
 */
export async function createBindPayToken(userId: string, productId: string): Promise<string> {
  const id = generateShortId();
  const value = JSON.stringify({ uid: userId, pid: productId });
  await redis.setex(`${BIND_PAY_PREFIX}${id}`, TOKEN_TTL_SECONDS, value);
  return id;
}

/**
 * Verify and consume a bind-pay token.
 * Returns { userId, productId } if valid, or null if invalid/expired.
 * Token is deleted after successful verification (one-time use).
 */
export async function verifyBindPayToken(token: string): Promise<{ userId: string; productId: string } | null> {
  const key = `${BIND_PAY_PREFIX}${token}`;
  const pipeline = redis.pipeline();
  pipeline.get(key);
  pipeline.del(key);
  const results = await pipeline.exec();

  const raw = results?.[0]?.[1] as string | null;
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as { uid?: string; pid?: string };
    if (!data.uid || !data.pid) return null;
    return { userId: data.uid, productId: data.pid };
  } catch {
    return null;
  }
}
