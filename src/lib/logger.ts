/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/prefer-optional-chain, @typescript-eslint/no-base-to-string */
import pino from 'pino';
import pretty from 'pino-pretty';
import fs from 'fs';
import path from 'path';

const isDevelopment = process.env.NODE_ENV !== 'production';

// ============================================================================
// Backend alert hook (logger.error / logger.fatal -> UBot backend alert group)
// ============================================================================
const ALERT_DEDUP_WINDOW_MS = 60 * 1000;
const recentAlertFingerprints = new Map<string, number>();
let alertInFlight = 0;
let dotenvTried = false;

function safeString(value: unknown, maxLen = 500): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str =
    typeof value === 'string'
      ? value
      : (() => {
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        })();
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

function extractContext(loggerInstance: pino.Logger): string | undefined {
  try {
    const b = (loggerInstance as any).bindings?.() as Record<string, unknown> | undefined;
    const ctx = b?.context;
    return typeof ctx === 'string' ? ctx : undefined;
  } catch {
    return undefined;
  }
}

function extractErrorFromArgs(args: unknown[]): {
  name?: string;
  message?: string;
  stack?: string;
  user?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
} {
  const first = args[0];
  const second = args[1];

  const obj = first && typeof first === 'object' ? (first as Record<string, unknown>) : null;
  const msg =
    typeof second === 'string'
      ? second
      : typeof first === 'string'
        ? first
        : undefined;

  const errLike = (obj?.err ?? obj?.error) as unknown;
  const err = errLike instanceof Error ? errLike : null;

  const user =
    (typeof obj?.userId === 'string' && obj.userId) ||
    (typeof obj?.user === 'string' && obj.user) ||
    (typeof obj?.email === 'string' && obj.email) ||
    undefined;

  const resourceId =
    (typeof obj?.taskId === 'string' && obj.taskId) ||
    (typeof obj?.jobId === 'string' && obj.jobId) ||
    (typeof obj?.orderId === 'string' && obj.orderId) ||
    (typeof obj?.outputId === 'string' && obj.outputId) ||
    undefined;

  const metadata: Record<string, unknown> = { msg };
  if (obj) {
    // Keep metadata minimal to avoid huge payloads
    const allowKeys = [
      'taskId',
      'outputId',
      'jobId',
      'orderId',
      'userId',
      'email',
      'provider',
      'model',
      'status',
    ];
    for (const k of allowKeys) {
      if (k in obj) metadata[k] = obj[k];
    }
  }

  if (err) {
    return { name: err.name, message: err.message, stack: err.stack, user, resourceId, metadata };
  }

  return {
    name: typeof obj?.errorName === 'string' ? obj.errorName : undefined,
    message: safeString(errLike ?? msg ?? first),
    stack: typeof obj?.stack === 'string' ? obj.stack : undefined,
    user,
    resourceId,
    metadata,
  };
}

function shouldSendAlert(loggerInstance: pino.Logger, args: unknown[]): boolean {
  // Allow callers to opt-out: logger.error({ skipAlert: true, ... }, "...")
  const first = args[0];
  if (first && typeof first === 'object' && (first as any).skipAlert === true) return false;

  // Next.js build phase: modules may be evaluated during `next build`. Never send external alerts then.
  if (process.env.NEXT_PHASE === 'phase-production-build') return false;

  // Avoid alert loops (lark modules tend to log failures too)
  const ctx = extractContext(loggerInstance);
  if (ctx && ctx.toLowerCase().includes('lark')) return false;

  const { name, message } = extractErrorFromArgs(args);
  const msg =
    typeof args[1] === 'string' ? args[1] : typeof args[0] === 'string' ? args[0] : '';
  const key = `${ctx ?? 'unknown'}|${msg}|${name ?? ''}|${message ?? ''}`;

  const now = Date.now();
  const last = recentAlertFingerprints.get(key);
  if (last && now - last < ALERT_DEDUP_WINDOW_MS) return false;
  recentAlertFingerprints.set(key, now);

  // Backpressure
  if (alertInFlight >= 10) return false;

  return true;
}

function fireBackendAlert(
  loggerInstance: pino.Logger,
  level: 'error' | 'fatal',
  args: unknown[],
): void {
  if (!shouldSendAlert(loggerInstance, args)) return;

  // Prevent re-entrancy loops
  if (alertInFlight > 0) return;

  const ctx = extractContext(loggerInstance);
  const info = extractErrorFromArgs(args);
  const msg =
    typeof args[1] === 'string' ? args[1] : typeof args[0] === 'string' ? args[0] : 'logger.error';

  alertInFlight++;
  setImmediate(() => {
    void (async () => {
      try {
        // Ensure local .env is loaded when running in scripts/worker/dev environments.
        // Safe in production too (no-op if .env missing). Do it once.
        if (!dotenvTried) {
          dotenvTried = true;
          try {
            await import('dotenv/config');
          } catch {
            // ignore
          }
        }

        // Dynamic import to avoid circular dependency (lark modules also use createLogger)
        const mod = await import('./lark/notifications');
        mod.asyncSendBackendAlert({
          title: msg || 'Backend error',
          severity: level === 'fatal' ? 'critical' : 'error',
          source: 'other',
          environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
          service: ctx,
          resourceId: info.resourceId,
          user: info.user,
          errorName: info.name,
          errorMessage: info.message,
          stack: info.stack,
          metadata: info.metadata,
        });
      } catch {
        // Never let alerting break logging
      } finally {
        alertInFlight = Math.max(0, alertInFlight - 1);
      }
    })();
  });
}

// Create logs directory if it doesn't exist
if (isDevelopment) {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

// 让 "error" 字段也能正确序列化 Error 对象
const serializers = {
  error: pino.stdSerializers.err,
  err: pino.stdSerializers.err,
};

// Development: dual output (console + file)
// Production: stdout only (JSON)
const baseLogger = isDevelopment
  ? pino(
      {
        level: 'debug',
        serializers,
      },
      pino.multistream([
        // Stream 1: Pretty console output
        {
          stream: pretty({
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
            sync: true,
          }),
        },
        // Stream 2: JSON file output
        {
          stream: pino.destination({
            dest: path.join(process.cwd(), 'logs/app.log'),
            sync: false,
          }),
        },
      ])
    )
  : pino({
      level: 'info',
      serializers,
    });

function wrapLogger(l: pino.Logger): pino.Logger {
  return new Proxy(l as any, {
    get(target, prop, receiver) {
      if (prop === 'child') {
        return (bindings: Record<string, unknown>, options?: unknown) => {
          const child = (target as any).child(bindings, options);
          return wrapLogger(child);
        };
      }
      if (prop === 'error' || prop === 'fatal') {
        const level = prop === 'fatal' ? 'fatal' : 'error';
        return (...args: unknown[]) => {
          (target as any)[prop](...args);
          fireBackendAlert(target as any, level, args);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') return value.bind(target);
      return value;
    },
  }) as any;
}

export const logger = wrapLogger(baseLogger);
export const createLogger = (context: string) => logger.child({ context });

