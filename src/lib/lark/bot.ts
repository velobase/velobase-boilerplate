/**
 * Lark Bot API
 * 使用官方 SDK @larksuiteoapi/node-sdk
 */

import * as lark from '@larksuiteoapi/node-sdk';
import { createReadStream } from 'fs';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createLogger } from '../logger';
import type { LarkBotConfig, LarkCard } from './types';

const logger = createLogger('lark-bot');

// SDK 类型别名
type LarkClient = InstanceType<typeof lark.Client>;

interface LarkResponse {
  code?: number;
  msg?: string;
  data?: {
    message_id?: string;
    image_key?: string;
  };
}

export class LarkBot {
  private client: LarkClient;

  constructor(config: LarkBotConfig) {
    this.client = new lark.Client({
      appId: config.appId,
      appSecret: config.appSecret,
      appType: lark.AppType.SelfBuild,
      domain: config.useFeishu ? lark.Domain.Feishu : lark.Domain.Lark,
    });
  }

  /**
   * 发送消息到群聊
   * @param chatId 群聊 ID (chat_id)
   * @param msgType 消息类型
   * @param content 消息内容（JSON 字符串）
   */
  async sendMessage(chatId: string, msgType: string, content: string): Promise<LarkResponse> {
    logger.debug({ chatId, msgType }, 'Sending message to chat');

    const res = (await this.client.im.message.create({
      params: {
        receive_id_type: 'chat_id',
      },
      data: {
        receive_id: chatId,
        msg_type: msgType,
        content,
      },
    })) as LarkResponse;

    if (res.code !== 0) {
      logger.error({ res }, 'Failed to send message');
      throw new Error(`Failed to send message: ${res.msg}`);
    }

    logger.debug({ messageId: res.data?.message_id }, 'Message sent successfully');
    return res;
  }

  /**
   * 发送文本消息
   */
  async sendText(chatId: string, text: string): Promise<LarkResponse> {
    return this.sendMessage(chatId, 'text', JSON.stringify({ text }));
  }

  /**
   * 发送卡片消息
   */
  async sendCard(chatId: string, card: LarkCard): Promise<LarkResponse> {
    return this.sendMessage(chatId, 'interactive', JSON.stringify(card));
  }

  /**
   * 回复消息（用于话题/线程）
   * @param messageId 要回复的消息 ID（话题的 root_id）
   * @param msgType 消息类型
   * @param content 消息内容（JSON 字符串）
   */
  async replyMessage(messageId: string, msgType: string, content: string): Promise<LarkResponse> {
    logger.debug({ messageId, msgType }, 'Replying to message');

    const res = (await this.client.im.message.reply({
      path: {
        message_id: messageId,
      },
      data: {
        msg_type: msgType,
        content,
      },
    })) as LarkResponse;

    if (res.code !== 0) {
      logger.error({ res }, 'Failed to reply message');
      throw new Error(`Failed to reply message: ${res.msg}`);
    }

    logger.debug({ messageId: res.data?.message_id }, 'Reply sent successfully');
    return res;
  }

  /**
   * 回复文本消息
   */
  async replyText(messageId: string, text: string): Promise<LarkResponse> {
    return this.replyMessage(messageId, 'text', JSON.stringify({ text }));
  }

  /**
   * 回复卡片消息
   */
  async replyCard(messageId: string, card: LarkCard): Promise<LarkResponse> {
    return this.replyMessage(messageId, 'interactive', JSON.stringify(card));
  }

  /**
   * 使用默认卡片模板发送消息
   */
  async sendDefaultCard(chatId: string, title: string, content: string): Promise<LarkResponse> {
    return this.sendMessage(
      chatId,
      'interactive',
      lark.messageCard.defaultCard({ title, content })
    );
  }

  /**
   * 上传图片
   * @param imageData 图片二进制数据
   * @returns image_key
   */
  async uploadImage(imageData: Buffer): Promise<string> {
    logger.debug('Uploading image');

    // Lark SDK 需要 ReadStream，写入临时文件后读取
    const tempPath = join(tmpdir(), `lark-upload-${Date.now()}.tmp`);
    writeFileSync(tempPath, imageData);
    const stream = createReadStream(tempPath);

    let res: unknown;
    try {
      res = await this.client.im.image.create({
        data: {
          image_type: 'message',
          image: stream,
        },
      });
    } finally {
      // 清理临时文件
      try {
        unlinkSync(tempPath);
      } catch {
        // ignore
      }
    }

    // SDK 返回结构在不同版本下略有差异：
    // 可能是 { code, msg, data: { image_key } }，也可能直接是 { image_key }
    let imageKey: string | undefined;
    if (res && typeof res === 'object') {
      const resObj = res as Record<string, unknown>;
      if (typeof resObj.image_key === 'string') {
        imageKey = resObj.image_key;
      } else if (resObj.data && typeof resObj.data === 'object') {
        const dataObj = resObj.data as Record<string, unknown>;
        if (typeof dataObj.image_key === 'string') {
          imageKey = dataObj.image_key;
        }
      }
    }

    if (!imageKey) {
      logger.error({ res }, 'Failed to upload image: missing image_key');
      throw new Error('Failed to upload image: missing image_key');
    }

    logger.debug({ imageKey }, 'Image uploaded successfully');
    return imageKey;
  }

  /**
   * 从 URL 下载并上传图片
   */
  async uploadImageFromUrl(imageUrl: string): Promise<string> {
    logger.debug({ imageUrl }, 'Downloading image from URL');

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return this.uploadImage(Buffer.from(arrayBuffer));
  }

  /**
   * 发送图片消息
   */
  async sendImage(chatId: string, imageKey: string): Promise<LarkResponse> {
    return this.sendMessage(chatId, 'image', JSON.stringify({ image_key: imageKey }));
  }

  /**
   * 获取底层 client（用于高级操作）
   */
  getClient(): LarkClient {
    return this.client;
  }
}

/**
 * 创建 Lark Bot 实例
 */
export function createLarkBot(config: LarkBotConfig): LarkBot {
  return new LarkBot(config);
}
