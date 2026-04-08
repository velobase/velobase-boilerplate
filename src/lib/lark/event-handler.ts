/**
 * Lark Event Handler
 * 使用官方 SDK EventDispatcher 处理事件回调
 * 同时支持卡片交互回调
 */

import * as lark from '@larksuiteoapi/node-sdk';
import { env } from '@/env';
import { createLogger } from '../logger';
import type { LarkCard } from './types';

const logger = createLogger('lark-event');

// 事件数据类型
export interface MessageEventData {
  sender: {
    sender_id: {
      union_id?: string;
      user_id?: string;
      open_id: string;
    };
    sender_type: string;
    tenant_key?: string;
  };
  message: {
    message_id: string;
    root_id?: string;
    parent_id?: string;
    chat_id: string;
    chat_type: string;
    message_type: string;
    content: string;
    create_time?: string;
    mentions?: Array<{
      key: string;
      id: { open_id: string; user_id?: string; union_id?: string };
      name: string;
    }>;
  };
}

// 卡片交互事件数据类型
export interface CardActionEventData {
  open_id: string;
  user_id?: string;
  open_message_id: string;
  open_chat_id?: string;
  tenant_key?: string;
  token: string;
  action: {
    value: Record<string, unknown>;
    tag: string;
    option?: string;
    timezone?: string;
  };
}

/**
 * 解析文本消息内容
 */
export function parseTextContent(content: string): string {
  try {
    const parsed = JSON.parse(content) as { text?: string };
    return parsed.text ?? content;
  } catch {
    return content;
  }
}

// 消息处理器
let messageHandler: ((data: MessageEventData) => Promise<void> | void) | null = null;

// 卡片交互处理器
let cardActionHandler: ((data: CardActionEventData) => Promise<LarkCard | void> | LarkCard | void) | null = null;

// EventDispatcher（带 autoChallenge）
const eventDispatcher = new lark.EventDispatcher({
  encryptKey: env.LARK_ENCRYPT_KEY ?? '',
  verificationToken: env.LARK_VERIFICATION_TOKEN ?? '',
}).register({
  'im.message.receive_v1': async (data) => {
    const typed = data as MessageEventData;
    logger.info(
      { chatId: typed.message?.chat_id, senderId: typed.sender?.sender_id?.open_id },
      'Message received',
    );
    if (messageHandler) {
      await messageHandler(typed);
    }
  },
});

// CardActionHandler（处理卡片按钮点击）
const cardDispatcher = new lark.CardActionHandler(
  {
    encryptKey: env.LARK_ENCRYPT_KEY ?? '',
    verificationToken: env.LARK_VERIFICATION_TOKEN ?? '',
  },
  async (data: lark.InteractiveCardActionEvent) => {
    const typed = data as unknown as CardActionEventData;
    logger.info(
      {
        openId: typed.open_id,
        messageId: typed.open_message_id,
        action: typed.action,
      },
      'Card action received',
    );
    if (cardActionHandler) {
      const result = await cardActionHandler(typed);
      // 如果返回卡片，则更新原卡片
      if (result) {
        // 返回卡片内容，SDK 会自动更新原卡片
        return result as unknown;
      }
    }
    return undefined;
  },
);

/**
 * 注册消息事件处理器
 */
export function onMessage(handler: (data: MessageEventData) => Promise<void> | void): void {
  messageHandler = handler;
}

/**
 * 注册卡片交互处理器
 * 处理器可以返回一个 LarkCard 来更新原卡片，或返回 void 不更新
 */
export function onCardAction(handler: (data: CardActionEventData) => Promise<LarkCard | void> | LarkCard | void): void {
  cardActionHandler = handler;
}

/**
 * 判断请求是否是卡片交互事件
 * 卡片交互事件有 action 字段，而消息事件有 schema 字段
 */
function isCardActionRequest(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const obj = body as Record<string, unknown>;
  // 卡片交互事件特征：有 action 字段，或者解密后有 action 字段
  // 先检查是否有 schema 字段（普通事件 V2 格式）
  if ('schema' in obj) return false;
  // 检查是否有 action 字段
  if ('action' in obj) return true;
  // 加密情况下，无法直接判断，让 CardActionHandler 尝试处理
  // 但实际上飞书的卡片交互和事件回调 URL 是分开配置的
  // 如果用同一个 URL，需要在配置时选择"消息卡片请求网址"
  return false;
}

/**
 * 处理 Lark 事件请求（Next.js App Router 用）
 * 同时支持消息事件和卡片交互事件
 */
export async function handleEventRequest(
  body: unknown,
  headers: Record<string, string>
): Promise<unknown> {
  try {
    // 关键点：SDK 的 adaptDefault/adaptExpress 传入的数据是"拍平"的：
    // { headers: req.headers, ...reqBody }
    // 不是 { headers, body }。否则会导致 signature 校验失败 & 加密事件无法解密。
    // 这里必须把 headers 放在 prototype 上（和 SDK adapter 一致），这样 JSON.stringify(data) 只会序列化 body，
    // 同时又能通过 data.headers 取到 header 做解密/校验。
    const merged = Object.create({ headers }) as Record<string, unknown> & {
      headers: Record<string, string>;
    };
    if (body && typeof body === 'object') {
      Object.assign(merged, body as Record<string, unknown>);
    }

    // 判断是卡片交互还是消息事件
    if (isCardActionRequest(body)) {
      logger.info('Processing as card action request');
      const result = (await cardDispatcher.invoke(merged)) as unknown;
      return result ?? { success: true };
    }

    // 默认作为消息事件处理
    const result = (await eventDispatcher.invoke(merged)) as unknown;
    return result ?? { success: true };
  } catch (error) {
    logger.error({ error }, 'EventDispatcher invoke error');
    return { error: 'internal_error' };
  }
}
