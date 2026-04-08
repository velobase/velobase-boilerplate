/**
 * 服务端获取 PostHog Feature Flag
 */

import { getServerPostHog } from "@/analytics/server";
import { logger } from "@/lib/logger";

interface GetFeatureFlagOptions {
  distinctId: string;
  // PostHog Node SDK 这里期望的是 Record<string, string>
  // 我们在调用方会尽量传 string，如果有 undefined 会在这里过滤掉。
  personProperties?: Record<string, string | undefined>;
}

/**
 * 服务端获取 feature flag 值
 * 封装错误处理和 shutdown 逻辑
 */
export async function getFeatureFlag<T extends string>(
  flagKey: string,
  options: GetFeatureFlagOptions,
  defaultValue: T
): Promise<T> {
  const posthog = getServerPostHog();
  if (!posthog) return defaultValue;

  try {
    const personProps = options.personProperties
      ? Object.fromEntries(
          Object.entries(options.personProperties).filter(
            ([, v]) => typeof v === "string"
          ) as [string, string][]
        )
      : undefined;

    const value = await posthog.getFeatureFlag(flagKey, options.distinctId, {
      personProperties: personProps,
    });
    await posthog.shutdown();
    
    if (typeof value === "string") {
      return value as T;
    }
    return defaultValue;
  } catch (error) {
    logger.warn({ error, flagKey }, `Failed to get feature flag ${flagKey}`);
    return defaultValue;
  }
}

