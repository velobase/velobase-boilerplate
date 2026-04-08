import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "@/env";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";
import { createLogger } from "@/lib/logger";
import { ipRateLimiter, getRetryAfterSeconds } from "@/server/ratelimit";
import { asyncSendBackendAlert } from "@/lib/lark";

const logger = createLogger('trpc-handler');

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = async (req: NextRequest) => {
  // IP-level rate limiting (global protection against abuse)
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0]?.trim() ?? realIp ?? '127.0.0.1';

  try {
    await ipRateLimiter.consume(ip);
  } catch (rejection) {
    const retryAfter = getRetryAfterSeconds(rejection);
    
    logger.warn({ ip, retryAfter }, 'IP rate limit exceeded');
    
    return new Response(
      JSON.stringify({ 
        error: { 
          code: 'TOO_MANY_REQUESTS',
          message: `Too many requests from this IP. Please retry after ${retryAfter} second(s).`,
        } 
      }), 
      { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  // Continue to tRPC handler
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error, ctx }) => {
      // 始终记录错误日志；但对“封禁”这类预期内拒绝，避免触发 logger.error 的报警卡片（skipAlert）。
      const isSuspended =
        error.code === "FORBIDDEN" &&
        typeof error.message === "string" &&
        error.message.includes("suspended");

      logger.error(
        { path, err: error, skipAlert: isSuspended },
        `tRPC failed on ${path ?? "<no-path>"}`,
      );

      // 发送 Lark 后端报警（仅对 INTERNAL_SERVER_ERROR 报警，避免噪音）
      if (error.code === "INTERNAL_SERVER_ERROR") {
        asyncSendBackendAlert({
          title: `tRPC 错误 - ${path ?? "<no-path>"}`,
          severity: "error",
          source: "api",
          environment: env.NODE_ENV,
          service: "trpc",
          resourceId: path,
          user: ctx?.session?.user?.email ?? ctx?.session?.user?.id,
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
          metadata: {
            code: error.code,
            clientIp: ip,
          },
        });
      }
    },
  });
};

export { handler as GET, handler as POST };
