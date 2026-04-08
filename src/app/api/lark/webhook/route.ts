/**
 * Lark 事件回调 API
 * 配置回调地址: https://example.com/api/lark/webhook
 * 
 * 同时处理：
 * 1. 消息事件（im.message.receive_v1）
 * 2. 卡片交互事件（按钮点击）
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import {
  handleEventRequest,
  onMessage,
  onCardAction,
  parseTextContent,
  type MessageEventData,
  type CardActionEventData,
} from '@/lib/lark/event-handler';
import { getLarkBot, LARK_CHAT_IDS } from '@/lib/lark';
import type { LarkCard } from '@/lib/lark';
import { generateHourlyReport } from '@/workers/processors/conversion-alert/generate-report';
import { buildMetricsCard } from '@/workers/processors/conversion-alert/build-card';
import { handleSupportCardAction } from '@/server/support/handlers/card-action';

const logger = createLogger('lark-webhook');

// 注册消息事件处理器（应用启动时执行一次）
onMessage(async (data: MessageEventData) => {
  const text = parseTextContent(data.message.content);
  const chatId = data.message.chat_id;

  logger.info(
    {
      chatId,
      senderId: data.sender.sender_id.open_id,
      text,
    },
    'Received message'
  );

  // 小时报群收到 @bot 消息时，发送小时报
  if (chatId === LARK_CHAT_IDS.CONVERSION_ALERT) {
    try {
      logger.info('Generating hourly report on demand');
      const report = await generateHourlyReport({ isDaily: false });
      const card = buildMetricsCard(report, { isDaily: false });
      const bot = getLarkBot();
      await bot.sendCard(chatId, card);
      logger.info('Hourly report sent on demand');
    } catch (error) {
      logger.error({ error }, 'Failed to send hourly report on demand');
    }
  }

  // 日报群收到 @bot 消息时，发送日报（昨日数据 vs 前日数据）
  if (chatId === LARK_CHAT_IDS.CONVERSION_ALERT_DAILY) {
    try {
      logger.info('Generating daily report on demand');
      const report = await generateHourlyReport({ isDaily: true });
      const card = buildMetricsCard(report, { isDaily: true });
      const bot = getLarkBot();
      await bot.sendCard(chatId, card);
      logger.info('Daily report sent on demand');
    } catch (error) {
      logger.error({ error }, 'Failed to send daily report on demand');
    }
  }
});

// 注册卡片交互处理器
onCardAction(async (data: CardActionEventData): Promise<LarkCard | void> => {
  const actionValue = data.action.value;
  
  logger.info({ actionValue }, 'Processing card action');

  // 检查是否是客诉审核卡片的操作
  if (actionValue && typeof actionValue === 'object' && 'ticketId' in actionValue) {
    return handleSupportCardAction(data);
  }

  // 其他卡片操作可以在这里添加...

  logger.warn({ actionValue }, 'Unknown card action');
  return undefined;
});

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    // 提取 headers 传给 SDK
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const result = await handleEventRequest(body, headers);
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to handle Lark webhook');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
