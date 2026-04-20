/**
 * Lark (飞书) API 集成
 *
 * 支持两种发送方式：
 * 1. Webhook - 通过群 webhook URL 发送（简单，无需 App）
 * 2. Bot API - 通过 App ID/Secret 发送（功能更丰富）
 */

import { env } from '@/env';
import { LarkBot } from './bot';

export * from './types';
export * from './webhook';
export * from './bot';
export * from './card-builder';
export * from './event-handler';
export * from './constants';
export * from './notifications';

// Re-export convenience functions
export { createLarkWebhook, LarkWebhook } from './webhook';
export { createLarkBot, LarkBot } from './bot';
export { createCard, CardBuilder, text, mdText } from './card-builder';

// 全局单例
let globalLarkBot: LarkBot | null = null;
let globalFeishuBot: LarkBot | null = null;

/**
 * 检查 Lark Bot 是否已配置
 * 未配置时各通知函数会静默跳过，避免日志噪音
 */
export function isLarkConfigured(): boolean {
  return !!(env.LARK_APP_ID && env.LARK_APP_SECRET);
}

/**
 * 获取全局 Lark Bot 实例
 * 需要配置环境变量: LARK_APP_ID, LARK_APP_SECRET
 */
export function getLarkBot(): LarkBot {
  if (!globalLarkBot) {
    if (!env.LARK_APP_ID || !env.LARK_APP_SECRET) {
      throw new Error('LARK_APP_ID and LARK_APP_SECRET are required');
    }
    globalLarkBot = new LarkBot({
      appId: env.LARK_APP_ID,
      appSecret: env.LARK_APP_SECRET,
      useFeishu: env.LARK_USE_FEISHU,
    });
  }
  return globalLarkBot;
}

/**
 * 获取全局飞书 Bot 实例 (国内版)
 * 需要配置环境变量: FEISHU_APP_ID, FEISHU_APP_SECRET
 * 如果未配置返回 null
 */
export function getFeishuBot(): LarkBot | null {
  if (!env.FEISHU_APP_ID || !env.FEISHU_APP_SECRET) {
    return null;
  }
  if (!globalFeishuBot) {
    globalFeishuBot = new LarkBot({
      appId: env.FEISHU_APP_ID,
      appSecret: env.FEISHU_APP_SECRET,
      useFeishu: true, // 国内飞书强制使用 feishu 域名
    });
  }
  return globalFeishuBot;
}


/**
 * 获取默认 Chat ID
 */
export function getDefaultChatId(): string {
  if (!env.LARK_DEFAULT_CHAT_ID) {
    throw new Error('LARK_DEFAULT_CHAT_ID is required');
  }
  return env.LARK_DEFAULT_CHAT_ID;
}

