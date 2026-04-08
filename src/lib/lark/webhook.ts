/**
 * Lark Webhook 发送器
 * 通过飞书群 webhook URL 发送消息
 */

import { createLogger } from '../logger';
import type {
  WebhookMessage,
  WebhookTextMessage,
  WebhookPostMessage,
  WebhookInteractiveMessage,
  WebhookResponse,
  LarkCard,
  PostContent,
} from './types';

const logger = createLogger('lark-webhook');

export class LarkWebhook {
  private webhookUrl: string;
  private timeout: number;

  constructor(webhookUrl: string, timeout = 30000) {
    this.webhookUrl = webhookUrl;
    this.timeout = timeout;
  }

  /**
   * 发送原始消息
   */
  async send(message: WebhookMessage): Promise<WebhookResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      logger.debug({ webhookUrl: this.webhookUrl, msgType: message.msg_type }, 'Sending webhook message');

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
        signal: controller.signal,
      });

      const result = (await response.json()) as WebhookResponse;

      if (result.code !== 0 && result.StatusCode !== 0) {
        logger.error({ result }, 'Webhook send failed');
        throw new Error(`Webhook send failed: ${result.msg || result.StatusMessage}`);
      }

      logger.debug({ result }, 'Webhook message sent successfully');
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('Webhook request timeout');
        throw new Error('Webhook request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 发送文本消息
   */
  async sendText(text: string): Promise<WebhookResponse> {
    const message: WebhookTextMessage = {
      msg_type: 'text',
      content: { text },
    };
    return this.send(message);
  }

  /**
   * 发送富文本消息
   */
  async sendPost(title: string, content: PostContent['content'], lang: 'zh_cn' | 'en_us' = 'zh_cn'): Promise<WebhookResponse> {
    const message: WebhookPostMessage = {
      msg_type: 'post',
      content: {
        post: {
          [lang]: {
            title,
            content,
          },
        },
      },
    };
    return this.send(message);
  }

  /**
   * 发送卡片消息
   */
  async sendCard(card: LarkCard): Promise<WebhookResponse> {
    const message: WebhookInteractiveMessage = {
      msg_type: 'interactive',
      card,
    };
    return this.send(message);
  }
}

/**
 * 创建 Webhook 发送器
 */
export function createLarkWebhook(webhookUrl: string, timeout?: number): LarkWebhook {
  return new LarkWebhook(webhookUrl, timeout);
}


