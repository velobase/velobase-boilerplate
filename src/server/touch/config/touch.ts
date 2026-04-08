export const TOUCH_LOCK_DURATION_MS = 5 * 60_000; // 5 minutes

// Retry backoff (simple exponential with cap)
export const TOUCH_RETRY_BASE_DELAY_MS = 60_000; // 1 minute
export const TOUCH_RETRY_MAX_DELAY_MS = 6 * 60 * 60_000; // 6 hours


