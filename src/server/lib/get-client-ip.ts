/**
 * Extract client IP address from request headers
 * 
 * Handles various proxy configurations (Vercel, Cloudflare, etc.)
 */
export function getClientIp(req: Request): string {
  return getClientIpFromHeaders(req.headers);
}

/**
 * Extract client IP from Headers object
 * Used by tRPC context and other places that have Headers but not full Request
 */
export function getClientIpFromHeaders(headers: Headers): string {
  // Priority order (Cloudflare first since we're behind CF):
  // 1. CF-Connecting-IP (Cloudflare specific, most reliable behind CF)
  // 2. X-Real-IP (set by nginx with forwarded-for-header config)
  // 3. X-Forwarded-For first entry (standard proxy header)
  
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
    // The first one is the original client IP
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }
  
  // Fallback for development/testing
  return 'unknown';
}

/**
 * Get all IP-related headers for debugging
 */
export function getIpDebugInfo(headers: Headers): Record<string, string | null> {
  return {
    'cf-connecting-ip': headers.get('cf-connecting-ip'),
    'x-real-ip': headers.get('x-real-ip'),
    'x-forwarded-for': headers.get('x-forwarded-for'),
    'resolved-ip': getClientIpFromHeaders(headers),
  };
}

/**
 * Normalize IP for rate limiting
 * 
 * For IPv6: truncate to /64 network (same user may have multiple addresses in /64)
 * For IPv4: use as-is
 * 
 * @example
 * normalizeIpForRateLimit('2607:a400:c:44c:73b:dfba:6cdd:542c') // '2607:a400:c:44c'
 * normalizeIpForRateLimit('107.151.158.76') // '107.151.158.76'
 */
export function normalizeIpForRateLimit(ip: string): string {
  if (!ip || ip === 'unknown') {
    return 'unknown';
  }
  
  // Check if IPv6 (contains colon)
  if (ip.includes(':')) {
    // IPv6: truncate to /64 (first 4 segments)
    const segments = ip.split(':');
    // Handle compressed IPv6 (::) by expanding if needed
    if (segments.length >= 4) {
      return segments.slice(0, 4).join(':');
    }
    // Fallback for short/compressed IPv6
    return ip;
  }
  
  // IPv4: use as-is
  return ip;
}

