/**
 * Lark 通知服务
 * 视频生成完成通知 + 支付成功通知
 */

import { createLogger } from '../logger';
import { getLarkBot, getFeishuBot, isLarkConfigured } from './index';
import { LARK_CHAT_IDS, FEISHU_CHAT_IDS } from './constants';
import type { LarkCard, LarkElement, LarkField, PaymentNotification } from './types';
import { buildPaymentCard } from './cards/payment-card';

const logger = createLogger('lark-notification');

// Re-export PaymentNotification for consumers
export type { PaymentNotification } from './types';

// ============================================================================
// 类型定义
// ============================================================================

interface _DeprecatedVideoGenerationNotification {
  /** 用户名或邮箱 */
  userName: string;
  /** 用户邮箱（可选） */
  userEmail?: string;
  /** 视频 URL */
  videoUrl: string;
  /** 原图 URL（可选，会自动上传到 Lark） */
  sourceImageUrl?: string;
  /** 原图 Lark img_key（内部使用） */
  sourceImageKey?: string;
  /** 视频封面图 URL（可选） */
  thumbnailUrl?: string;
  /** 使用的模型 */
  model: string;
  /** 提示词（可选，可能很长） */
  prompt?: string;
  /** 原始提示词（扩句前，仅当发生扩句时有值） */
  originalPrompt?: string;
  /** 任务 ID */
  taskId: string;
  /** 视频时长（秒，用户设置的） */
  videoDuration?: number;
  /** 生成耗时（秒） */
  generationSeconds?: number;
  /** 消耗积分 */
  creditsUsed?: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息（失败时） */
  errorMessage?: string;
  /** 水印移除后的图片 URL */
  processedImageUrl?: string;
  /** 是否为用户首次生成视频 */
  isFirstGeneration?: boolean;
  /** 用户剩余积分余额 */
  userBalance?: number;
  
  // --- Extend / Upscale 相关 ---
  /** 任务类型: 'generate' = 图生视频, 'extend' = 视频延长, 'upscale' = 视频高清化 */
  taskType?: 'generate' | 'extend' | 'upscale';
  /** 原视频 URL (extend/upscale 时有效) */
  sourceVideoUrl?: string;
}

export type AlertSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface BackendAlertNotification {
  /** 标题（短句，展示在卡片头部） */
  title: string;
  /** 严重级别 */
  severity: AlertSeverity;
  /** 来源模块 */
  source: 'worker' | 'api' | 'task' | 'payment' | 'other';
  /** 运行环境（prod / dev / etc） */
  environment?: string;
  /** 服务/模块名称，如 queueName、route、service 名 */
  service?: string;
  /** 资源 ID，例如 jobId、orderId、requestId */
  resourceId?: string;
  /** 用户标识（userId、email 等） */
  user?: string;
  /** 错误类型 */
  errorName?: string;
  /** 错误信息 */
  errorMessage?: string;
  /** 错误堆栈（会被截断） */
  stack?: string;
  /** 额外元数据（会序列化并截断） */
  metadata?: Record<string, unknown>;
  /** 聚合指纹（不传则自动从 title + errorName + errorMessage 推导） */
  fingerprint?: string;
}

export interface FrontendAlertNotification {
  /** 标题（短句，展示在卡片头部） */
  title: string;
  /** 严重级别 */
  severity: AlertSeverity;
  /** 错误信息（message 文本） */
  errorMessage: string;
  /** 前端路由（如 /pricing） */
  route?: string;
  /** 完整 URL */
  url?: string;
  /** 用户标识（userId 或 email） */
  user?: string;
  /** 浏览器/设备信息 */
  browser?: string;
  /** 错误类型 */
  errorName?: string;
  /** 堆栈（会截断） */
  stack?: string;
  /** 聚合后的出现次数 */
  occurrenceCount?: number;
  /** 首次/最近一次出现时间（ISO 字符串或简短描述） */
  firstSeenAt?: string;
  lastSeenAt?: string;
  /** 额外元数据（会序列化并截断） */
  metadata?: Record<string, unknown>;
  /** 聚合指纹（不传则自动推导） */
  fingerprint?: string;
}

export interface PromptAbuseNotification {
  currentTask: {
    userId: string;
    userEmail: string | null;
    loginProvider: string;
    hasAvatar: boolean;
    prompt: string;
    imageUrl: string;
  };
  existingTask: {
    userId: string;
    userEmail: string | null;
    loginProvider: string;
    hasAvatar: boolean;
    prompt: string;
    imageUrl: string | null;
  };
  hammingDistance: number; // -1 表示通过前4词匹配
  matchReason?: string; // "simhash" | "first4words"
  abuseScore: number;
  reason: string;
  blocked: boolean;
  
  /** 内部使用的图片 key */
  currentImageKey?: string;
  existingImageKey?: string;
}

export interface EmailAbuseNotification {
  /** 新注册的用户 ID */
  userId: string;
  /** 新注册的邮箱 */
  email: string;
  /** 注册 IP */
  signupIp: string;
  /** 滥用分数 */
  abuseScore: number;
  /** AI 判定理由 */
  reason: string;
  /** 同 IP 已有的邮箱列表 */
  existingEmails: string[];
  /** 是否已封禁 */
  blocked: boolean;
}

export interface QueueBoostNotification {
  /** 用户名或邮箱 */
  userName: string;
  /** 用户邮箱（可选） */
  userEmail?: string;
  /** 用户 ID */
  userId: string;
  /** 消耗积分 */
  creditsUsed: number;
  /** 加速任务数 */
  promotedCount: number;
  /** 剩余余额 */
  remainingBalance: number;
  /** 是否为测试环境 */
  isTest?: boolean;
}

// ============================================================================
// 内部工具：字符串截断 & 限流
// ============================================================================

const ALERT_THROTTLE_WINDOWS_MS: Record<AlertSeverity, number> = {
  critical: 60_000, // 1 min
  error: 5 * 60_000, // 5 min
  warning: 10 * 60_000, // 10 min
  info: 30 * 60_000, // 30 min
};

const sentAlertTimestamps = new Map<string, number>();

function truncate(value: string | undefined, maxLength: number): string | undefined {
  if (!value) return value;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function safeStringifyMetadata(meta?: Record<string, unknown>, maxLength = 600): string | undefined {
  if (!meta) return undefined;
  try {
    const json = JSON.stringify(meta, null, 2);
    return truncate(json, maxLength);
  } catch (error) {
    logger.warn({ error }, 'Failed to stringify alert metadata');
    return '[metadata serialization failed]';
  }
}

function shouldThrottleAlert(key: string, severity: AlertSeverity): boolean {
  const now = Date.now();
  const windowMs = ALERT_THROTTLE_WINDOWS_MS[severity];
  const last = sentAlertTimestamps.get(key);

  if (last && now - last < windowMs) {
    logger.debug({ key, severity }, 'Alert throttled');
    return true;
  }

  sentAlertTimestamps.set(key, now);
  return false;
}

// ============================================================================
// 卡片构建
// ============================================================================

/**
 * 构建视频生成通知卡片
 */
function buildVideoGenerationCard(data: _DeprecatedVideoGenerationNotification): LarkCard {
  const isExtend = data.taskType === 'extend';
  const isUpscale = data.taskType === 'upscale';
  const isVideoInput = isExtend || isUpscale;
  const statusEmoji = data.success ? '✅' : '❌';
  
  // 根据任务类型区分文案
  const taskTypeText = isUpscale ? '视频高清化' : isExtend ? '视频延长' : '视频生成';
  const statusText = data.success ? '成功' : '失败';

  const elements: LarkElement[] = [];

  // 1. 原图展示 (仅图生视频，extend/upscale 不展示)
  if (!isVideoInput && data.sourceImageKey) {
    elements.push({
      tag: 'img',
      img_key: data.sourceImageKey,
      alt: { tag: 'plain_text', content: '原图' },
      title: { tag: 'plain_text', content: '🖼️ 原图' }
    });
    elements.push({ tag: 'hr' });
  }

  // 2. 核心信息字段 (使用 fields 布局)
  const fields: LarkField[] = [
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `👤 **用户**\n${data.userName}${data.isFirstGeneration ? ' (🆕首单)' : ''}`
      }
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        // Extend 显示 "模型 (延长)"，Upscale 显示 "模型 (高清化)"，普通生成显示模型名
        content: `🤖 **模型**\n${data.model}${isUpscale ? ' (高清化)' : isExtend ? ' (延长)' : ''}`
      }
    }
  ];

  // 视频时长 & 积分
  if (data.videoDuration) {
    // Extend 显示 "+5s"，Upscale 显示 "5s → 4K"，普通生成显示 "5s"
    const durationText = isUpscale 
      ? `${data.videoDuration}s → 4K` 
      : isExtend 
        ? `+${data.videoDuration}s` 
        : `${data.videoDuration}s`;
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `📹 **时长**\n${durationText}`
      }
    });
  }
  if (data.creditsUsed !== undefined) {
    let creditsContent = `💰 **积分**\n-${data.creditsUsed}`;
    if (data.userBalance !== undefined) {
      creditsContent += ` (余 ${data.userBalance})`;
    }
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: creditsContent
      }
    });
  }

  // 额外信息 (邮箱, 水印)
  if (data.userEmail && data.userEmail !== data.userName) {
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `📧 **邮箱**\n${data.userEmail}`
      }
    });
  }

  elements.push({
    tag: 'div',
    fields: fields
  });

  // 3. Prompt 展示区
  if (data.originalPrompt) {
    // 发生了扩句，显示原始和扩展后的
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `📝 **原始**: ${data.originalPrompt}`
      }
    });
    const displayPrompt = data.prompt && data.prompt.length > 200 
      ? data.prompt.substring(0, 200) + '...' 
      : data.prompt;
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `✨ **扩句**: ${displayPrompt}`
      }
    });
  } else if (data.prompt) {
    const displayPrompt = data.prompt.length > 200 
      ? data.prompt.substring(0, 200) + '...' 
      : data.prompt;
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `💬 **提示词**: ${displayPrompt}`
      }
    });
  }

  elements.push({ tag: 'hr' });

  // 4. 成功状态: 视频按钮
  if (data.success) {
    // 按钮文案: Upscale 显示 "查看4K视频"，Extend 显示 "查看延长后视频"，普通生成显示 "下载/观看视频"
    const buttonText = isUpscale 
      ? '🎬 查看4K视频' 
      : isExtend 
        ? '🎬 查看延长后视频' 
        : '🎬 下载/观看视频';
    const actions: Array<{
      tag: 'button';
      text: { tag: 'plain_text'; content: string };
      url: string;
      type: 'primary' | 'default';
    }> = [
        {
          tag: 'button',
        text: { tag: 'plain_text', content: buttonText },
          url: data.videoUrl,
          type: 'primary'
        }
    ];

    // Extend/Upscale 添加「原视频」按钮
    if (isVideoInput && data.sourceVideoUrl) {
      actions.push({
        tag: 'button',
        text: { tag: 'plain_text', content: '📼 原视频' },
        url: data.sourceVideoUrl,
        type: 'default'
      });
    }

    elements.push({
      tag: 'action',
      actions
    });
  } else {
    // 失败状态: 错误信息
    elements.push({
      tag: 'div',
      text: {
        tag: 'lark_md',
        content: `❌ **错误信息**: \n${data.errorMessage ?? '未知错误'}`
      }
    });
  }

  // 5. 底部备注 (技术参数)
  const techInfo: string[] = [`🆔 ${data.taskId}`];
  if (data.generationSeconds) {
    techInfo.push(`⏱️ ${data.generationSeconds.toFixed(1)}s`);
  }

  elements.push({
    tag: 'note',
    elements: [
      {
        tag: 'plain_text',
        content: techInfo.join(' | ')
      }
    ]
  });

  // 卡片颜色: Upscale 用 purple，Extend 用 orange，普通生成用 blue，失败用 red
  const headerColor = data.success 
    ? (isUpscale ? 'purple' : isExtend ? 'orange' : 'blue') 
    : 'red';

  return {
    config: { wide_screen_mode: true },
    header: {
      template: headerColor,
      title: {
        tag: 'plain_text',
        content: `${statusEmoji} ${taskTypeText}${statusText}`,
      },
    },
    elements,
  };
}

// buildPaymentCard has been moved to src/lib/lark/cards/payment-card.ts

/**
 * 构建后端报警卡片
 */
function buildBackendAlertCard(data: BackendAlertNotification): LarkCard {
  const severityEmoji: Record<AlertSeverity, string> = {
    critical: '🚨',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const headerTemplate =
    data.severity === 'critical' || data.severity === 'error'
      ? 'red'
      : data.severity === 'warning'
        ? 'orange'
        : 'blue';

  const elements: LarkElement[] = [];
  const fields: LarkField[] = [];

  fields.push({
    is_short: true,
    text: {
      tag: 'lark_md',
      content: `🚦 **级别**\n${data.severity.toUpperCase()}`,
    },
  });

  fields.push({
    is_short: true,
    text: {
      tag: 'lark_md',
      content: `🧩 **来源**\n${data.source}`,
    },
  });

  if (data.environment) {
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🌍 **环境**\n${data.environment}`,
      },
    });
  }

  if (data.service) {
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🛠️ **服务**\n${data.service}`,
      },
    });
  }

  if (data.resourceId) {
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🆔 **资源**\n${data.resourceId}`,
      },
    });
  }

  if (data.user) {
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `👤 **用户**\n${data.user}`,
      },
    });
  }

  if (fields.length > 0) {
    elements.push({
      tag: 'div',
      fields,
    });
    elements.push({ tag: 'hr' });
  }

  const lines: string[] = [];
  if (data.errorName) {
    lines.push(`**错误类型**: \`${data.errorName}\``);
  }
  if (data.errorMessage) {
    lines.push(`**错误信息**: ${truncate(data.errorMessage, 300)}`);
  }

  if (lines.length > 0) {
    elements.push({
      tag: 'markdown',
      content: lines.join('\n'),
    });
  }

  const stackText = truncate(data.stack, 600);
  if (stackText) {
    elements.push({ tag: 'hr' });
    elements.push({
      tag: 'markdown',
      content: `\`\`\`\n${stackText}\n\`\`\``,
    });
  }

  const metaText = safeStringifyMetadata(data.metadata);
  const noteLines: string[] = [];
  if (metaText) {
    noteLines.push(metaText);
  }
  if (data.fingerprint) {
    noteLines.push(`fingerprint: ${data.fingerprint}`);
  }

  if (noteLines.length > 0) {
    elements.push({
      tag: 'note',
      elements: [
        {
          tag: 'plain_text',
          content: truncate(noteLines.join('\n\n'), 900) ?? '',
        },
      ],
    });
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      template: headerTemplate,
      title: {
        tag: 'plain_text',
        content: `${severityEmoji[data.severity]} ${data.title}`,
      },
    },
    elements,
  };
}

/**
 * 构建前端报警卡片
 */
function buildFrontendAlertCard(data: FrontendAlertNotification): LarkCard {
  const severityEmoji: Record<AlertSeverity, string> = {
    critical: '🚨',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const headerTemplate =
    data.severity === 'critical' || data.severity === 'error'
      ? 'red'
      : data.severity === 'warning'
        ? 'orange'
        : 'blue';

  const elements: LarkElement[] = [];
  const fields: LarkField[] = [];

  fields.push({
    is_short: true,
    text: {
      tag: 'lark_md',
      content: `🚦 **级别**\n${data.severity.toUpperCase()}`,
    },
  });

  if (data.route) {
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🧭 **路由**\n${data.route}`,
      },
    });
  }

  if (data.user) {
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `👤 **用户**\n${data.user}`,
      },
    });
  }

  if (data.browser) {
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🌐 **浏览器**\n${data.browser}`,
      },
    });
  }

  if (typeof data.occurrenceCount === 'number') {
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🔢 **次数**\n${data.occurrenceCount}`,
      },
    });
  }

  if (fields.length > 0) {
    elements.push({
      tag: 'div',
      fields,
    });
    elements.push({ tag: 'hr' });
  }

  const lines: string[] = [];
  lines.push(`**错误信息**: ${truncate(data.errorMessage, 300)}`);
  if (data.errorName) {
    lines.push(`**错误类型**: \`${data.errorName}\``);
  }

  if (data.url) {
    lines.push(`**URL**: ${data.url}`);
  }

  elements.push({
    tag: 'markdown',
    content: lines.join('\n'),
  });

  const stackText = truncate(data.stack, 600);
  if (stackText) {
    elements.push({ tag: 'hr' });
    elements.push({
      tag: 'markdown',
      content: `\`\`\`\n${stackText}\n\`\`\``,
    });
  }

  const metaText = safeStringifyMetadata(data.metadata);
  const noteLines: string[] = [];
  if (metaText) {
    noteLines.push(metaText);
  }
  if (data.firstSeenAt || data.lastSeenAt) {
    noteLines.push(
      [
        data.firstSeenAt ? `firstSeen: ${data.firstSeenAt}` : null,
        data.lastSeenAt ? `lastSeen: ${data.lastSeenAt}` : null,
      ]
        .filter(Boolean)
        .join(' | ')
    );
  }
  if (data.fingerprint) {
    noteLines.push(`fingerprint: ${data.fingerprint}`);
  }

  if (noteLines.length > 0) {
    elements.push({
      tag: 'note',
      elements: [
        {
          tag: 'plain_text',
          content: truncate(noteLines.join('\n\n'), 900) ?? '',
        },
      ],
    });
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      template: headerTemplate,
      title: {
        tag: 'plain_text',
        content: `${severityEmoji[data.severity]} ${data.title}`,
      },
    },
    elements,
  };
}

/**
 * 构建 Prompt 滥用检测卡片
 */
function buildPromptAbuseCard(data: PromptAbuseNotification): LarkCard {
  const { currentTask, existingTask, blocked, abuseScore, reason, currentImageKey, existingImageKey } = data;
  
  const title = blocked
    ? `🚨 Prompt 滥用检测 - 已封禁用户`
    : `⚠️ Prompt 相似检测 - 人工审查`;
  
  const headerTemplate = blocked ? 'red' : 'orange';

  const elements: LarkElement[] = [];

  // 1. 概览信息
  const matchReasonText = data.matchReason === 'first4words' 
    ? '前4词匹配' 
    : data.matchReason === 'simhash' 
      ? `SimHash (距离=${data.hammingDistance})` 
      : `距离=${data.hammingDistance}`;
  
  const overviewFields: LarkField[] = [
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🎯 **滥用分数**\n${abuseScore}/100`
      }
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🔍 **匹配方式**\n${matchReasonText}`
      }
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🤖 **处理结果**\n${blocked ? '🚫 已封禁' : '👀 需审查'}`
      }
    }
  ];

  elements.push({
    tag: 'div',
    fields: overviewFields
  });

  // AI 判定理由
  elements.push({
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `🧠 **AI 判定**: ${reason}`
    }
  });

  elements.push({ tag: 'hr' });

  // 2. 当前用户详情
  elements.push({
    tag: 'markdown',
    content: `**👤 当前用户 (提交中)**`
  });
  
  const currentUserFields: LarkField[] = [
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🆔 ${currentTask.userId}\n📧 ${currentTask.userEmail ?? 'N/A'}`
      }
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🔑 ${currentTask.loginProvider}\n🖼️ 头像: ${currentTask.hasAvatar ? '✅' : '❌'}`
      }
    }
  ];
  
  elements.push({
    tag: 'div',
    fields: currentUserFields
  });

  elements.push({
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `📝 **Prompt**: \n${currentTask.prompt}`
    }
  });

  if (currentImageKey) {
    elements.push({
      tag: 'img',
      img_key: currentImageKey,
      alt: { tag: 'plain_text', content: '当前输入图' },
      title: { tag: 'plain_text', content: '当前输入图' }
    });
  } else if (currentTask.imageUrl) {
     elements.push({
      tag: 'markdown',
      content: `[查看图片](${currentTask.imageUrl})`
    });
  }

  elements.push({ tag: 'hr' });

  // 3. 匹配用户详情
  elements.push({
    tag: 'markdown',
    content: `**👥 匹配用户 (历史记录)**`
  });
  
  const existingUserFields: LarkField[] = [
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🆔 ${existingTask.userId}\n📧 ${existingTask.userEmail ?? 'N/A'}`
      }
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🔑 ${existingTask.loginProvider}\n🖼️ 头像: ${existingTask.hasAvatar ? '✅' : '❌'}`
      }
    }
  ];
  
  elements.push({
    tag: 'div',
    fields: existingUserFields
  });

  elements.push({
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `📝 **Prompt**: \n${existingTask.prompt}`
    }
  });

  if (existingImageKey) {
    elements.push({
      tag: 'img',
      img_key: existingImageKey,
      alt: { tag: 'plain_text', content: '历史输入图' },
      title: { tag: 'plain_text', content: '历史输入图' }
    });
  } else if (existingTask.imageUrl) {
     elements.push({
      tag: 'markdown',
      content: `[查看图片](${existingTask.imageUrl})`
    });
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      template: headerTemplate,
      title: {
        tag: 'plain_text',
        content: title,
      },
    },
    elements,
  };
}

/**
 * 构建队列加速通知卡片
 */
function buildQueueBoostCard(data: QueueBoostNotification): LarkCard {
  const elements: LarkElement[] = [];

  // 核心信息
  const fields: LarkField[] = [
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `👤 **用户**\n${data.userName}`
      }
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🚀 **加速任务数**\n${data.promotedCount}`
      }
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `💰 **消耗积分**\n-${data.creditsUsed}`
      }
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `💎 **剩余余额**\n${data.remainingBalance}`
      }
    }
  ];

  if (data.userEmail && data.userEmail !== data.userName) {
    fields.push({
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `📧 **邮箱**\n${data.userEmail}`
      }
    });
  }

  elements.push({
    tag: 'div',
    fields
  });

  // 底部技术信息
  elements.push({ tag: 'hr' });
  const metaInfo = [
    `🆔 用户: ${data.userId}`,
    data.isTest ? `🧪 Env: TEST` : `🚀 Env: PROD`,
  ];

  elements.push({
    tag: 'note',
    elements: [
      {
        tag: 'plain_text',
        content: metaInfo.join(' | '),
      },
    ],
  });

  let title = `🚀 队列加速 - ${data.promotedCount}个任务`;
  if (data.isTest) {
    title = `🧪 ${title}`;
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      template: 'green',
      title: {
        tag: 'plain_text',
        content: title,
      },
    },
    elements,
  };
}

/**
 * 构建邮箱滥用检测卡片
 */
function buildEmailAbuseCard(data: EmailAbuseNotification): LarkCard {
  const title = data.blocked
    ? `🚨 邮箱滥用检测 - 已封禁用户`
    : `⚠️ 同 IP 多账号检测`;

  const headerTemplate = data.blocked ? 'red' : 'orange';
  const elements: LarkElement[] = [];

  // 1. 概览信息
  const overviewFields: LarkField[] = [
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🎯 **滥用分数**\n${data.abuseScore}/100`
      }
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🤖 **处理结果**\n${data.blocked ? '🚫 已封禁' : '👀 需审查'}`
      }
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `🌐 **注册 IP**\n${data.signupIp}`
      }
    },
    {
      is_short: true,
      text: {
        tag: 'lark_md',
        content: `👥 **同 IP 账号数**\n${data.existingEmails.length + 1}`
      }
    }
  ];

  elements.push({
    tag: 'div',
    fields: overviewFields
  });

  // AI 判定理由
  elements.push({
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `🧠 **AI 判定**: ${data.reason}`
    }
  });

  elements.push({ tag: 'hr' });

  // 2. 新注册用户
  elements.push({
    tag: 'markdown',
    content: `**🆕 新注册邮箱**\n\`${data.email}\`\n🆔 用户 ID: \`${data.userId}\``
  });

  elements.push({ tag: 'hr' });

  // 3. 同 IP 已有邮箱
  elements.push({
    tag: 'markdown',
    content: `**📧 同 IP 已有邮箱**\n${data.existingEmails.map((e, i) => `${i + 1}. \`${e}\``).join('\n')}`
  });

  return {
    config: { wide_screen_mode: true },
    header: {
      template: headerTemplate,
      title: {
        tag: 'plain_text',
        content: title,
      },
    },
    elements,
  };
}

// ============================================================================
// 发送通知
// ============================================================================

/**
 * 发送视频生成完成通知
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _sendVideoGenerationNotification(
  data: _DeprecatedVideoGenerationNotification
): Promise<void> {
  try {
    const bot = getLarkBot();

    // 如果有原图 URL，先上传到 Lark 获取 img_key
    let sourceImageKey = data.sourceImageKey;
    if (data.sourceImageUrl && !sourceImageKey) {
      try {
        sourceImageKey = await bot.uploadImageFromUrl(data.sourceImageUrl);
        logger.info({ taskId: data.taskId }, 'Source image uploaded to Lark');
      } catch (uploadError) {
        logger.warn(
          { error: uploadError, taskId: data.taskId },
          'Failed to upload source image, skipping'
        );
      }
    }

    const card = buildVideoGenerationCard({ ...data, sourceImageKey });

    await bot.sendCard(LARK_CHAT_IDS.VIDEO_WORKS, card);

    logger.info(
      { taskId: data.taskId, success: data.success },
      'Video generation notification sent'
    );
  } catch (error) {
    logger.error(
      { error, taskId: data.taskId },
      'Failed to send video generation notification'
    );
    // 不抛出错误，通知失败不应影响主流程
  }
}

/**
 * 发送支付通知
 * 同时发送到 Lark (国际版) 和飞书 (国内版)
 */
export async function sendPaymentNotification(
  data: PaymentNotification
): Promise<void> {
  if (!isLarkConfigured()) {
    logger.debug({ orderId: data.orderId }, 'Lark not configured, skipping payment notification');
    return;
  }
  const card = buildPaymentCard(data);
  const isSubscription = data.bizType === 'subscription';
  
  // 并行发送到 Lark 和飞书
  const promises: Promise<void>[] = [];
  
  // 1. 发送到 Lark (国际版)
  promises.push(
    (async () => {
      try {
        const bot = getLarkBot();
        const chatId = isSubscription
          ? data.status === 'failed'
            ? LARK_CHAT_IDS.SUBSCRIPTION_FAILED
            : LARK_CHAT_IDS.SUBSCRIPTION
          : data.status === 'failed'
            ? LARK_CHAT_IDS.PAYMENT_FAILED
            : LARK_CHAT_IDS.PAYMENT;
        await bot.sendCard(chatId, card);
        logger.info(
          { orderId: data.orderId, status: data.status, bizType: data.bizType ?? 'order' },
          'Payment notification sent to Lark'
        );
      } catch (error) {
        logger.error(
          { error, orderId: data.orderId, bizType: data.bizType ?? 'order' },
          'Failed to send payment notification to Lark'
        );
      }
    })()
  );
  
  // 2. 发送到飞书 (国内版) - 如果已配置
  const feishuBot = getFeishuBot();
  // 国内版不发送失败通知（避免噪音 & 维护成本）
  if (feishuBot && data.status !== 'failed') {
    promises.push(
      (async () => {
        try {
          await feishuBot.sendCard(FEISHU_CHAT_IDS.PAYMENT, card);
          logger.info(
            { orderId: data.orderId, status: data.status },
            'Payment notification sent to Feishu'
          );
        } catch (error) {
          logger.error(
            { error, orderId: data.orderId },
            'Failed to send payment notification to Feishu'
          );
        }
      })()
    );
  }
  
  await Promise.all(promises);
}

function buildBackendAlertFingerprint(data: BackendAlertNotification): string {
  const parts: string[] = [];
  parts.push(data.source);
  if (data.service) parts.push(data.service);
  if (data.errorName) parts.push(data.errorName);
  if (data.errorMessage) parts.push(data.errorMessage);
  if (data.title) parts.push(data.title);
  const joined = parts.join('|');
  return truncate(joined, 200) ?? 'backend-alert';
}

function buildFrontendAlertFingerprint(data: FrontendAlertNotification): string {
  const parts: string[] = [];
  if (data.route) parts.push(data.route);
  if (data.errorName) parts.push(data.errorName);
  if (data.errorMessage) parts.push(data.errorMessage);
  if (data.title) parts.push(data.title);
  const joined = parts.join('|');
  return truncate(joined, 200) ?? 'frontend-alert';
}

/**
 * 发送后端报警
 */
export async function sendBackendAlert(data: BackendAlertNotification): Promise<void> {
  if (!isLarkConfigured()) {
    logger.debug({ title: data.title, severity: data.severity }, 'Lark not configured, skipping backend alert');
    return;
  }
  try {
    const bot = getLarkBot();
    const fingerprint = data.fingerprint ?? buildBackendAlertFingerprint(data);
    const key = `backend:${fingerprint}`;

    if (shouldThrottleAlert(key, data.severity)) {
      return;
    }

    const card = buildBackendAlertCard({ ...data, fingerprint });
    await bot.sendCard(LARK_CHAT_IDS.ALERT_BACKEND, card);

    logger.info(
      { severity: data.severity, source: data.source, fingerprint },
      'Backend alert sent'
    );
  } catch (error) {
    logger.error({ error, data }, 'Failed to send backend alert');
  }
}

/**
 * 发送前端报警
 */
export async function sendFrontendAlert(
  data: FrontendAlertNotification
): Promise<void> {
  if (!isLarkConfigured()) {
    logger.debug({ title: data.title, severity: data.severity }, 'Lark not configured, skipping frontend alert');
    return;
  }
  try {
    const bot = getLarkBot();
    const fingerprint = data.fingerprint ?? buildFrontendAlertFingerprint(data);
    const key = `frontend:${fingerprint}`;

    if (shouldThrottleAlert(key, data.severity)) {
      return;
    }

    const card = buildFrontendAlertCard({ ...data, fingerprint });
    await bot.sendCard(LARK_CHAT_IDS.ALERT_FRONTEND, card);

    logger.info(
      { severity: data.severity, route: data.route, fingerprint },
      'Frontend alert sent'
    );
  } catch (error) {
    logger.error({ error, data }, 'Failed to send frontend alert');
  }
}

/**
 * 发送 Prompt 滥用通知
 */
export async function sendPromptAbuseNotification(
  data: PromptAbuseNotification
): Promise<void> {
  if (!isLarkConfigured()) {
    logger.debug({ blocked: data.blocked }, 'Lark not configured, skipping prompt abuse notification');
    return;
  }
  try {
    const bot = getLarkBot();
    
    // 尝试上传图片以获得更好的展示效果
    let currentImageKey = data.currentImageKey;
    if (data.currentTask.imageUrl && !currentImageKey) {
      try {
        currentImageKey = await bot.uploadImageFromUrl(data.currentTask.imageUrl);
      } catch (e) {
        logger.warn({ error: e }, 'Failed to upload current task image');
      }
    }
    
    let existingImageKey = data.existingImageKey;
    if (data.existingTask.imageUrl && !existingImageKey) {
      try {
        existingImageKey = await bot.uploadImageFromUrl(data.existingTask.imageUrl);
      } catch (e) {
         logger.warn({ error: e }, 'Failed to upload existing task image');
      }
    }

    const card = buildPromptAbuseCard({ ...data, currentImageKey, existingImageKey });
    await bot.sendCard(LARK_CHAT_IDS.RISK_CONTROL, card);

    logger.info(
      { 
        blocked: data.blocked, 
        currentUserId: data.currentTask.userId 
      },
      'Prompt abuse notification sent'
    );
  } catch (error) {
    logger.error({ error, data }, 'Failed to send prompt abuse notification');
  }
}

/**
 * 发送邮箱滥用通知
 */
export async function sendEmailAbuseNotification(
  data: EmailAbuseNotification
): Promise<void> {
  if (!isLarkConfigured()) {
    logger.debug({ email: data.email, blocked: data.blocked }, 'Lark not configured, skipping email abuse notification');
    return;
  }
  try {
    const bot = getLarkBot();
    const card = buildEmailAbuseCard(data);
    await bot.sendCard(LARK_CHAT_IDS.RISK_CONTROL, card);

    logger.info(
      {
        blocked: data.blocked,
        userId: data.userId,
        email: data.email,
        signupIp: data.signupIp,
      },
      'Email abuse notification sent'
    );
  } catch (error) {
    logger.error({ error, data }, 'Failed to send email abuse notification');
  }
}

/**
 * 发送队列加速通知
 */
export async function sendQueueBoostNotification(
  data: QueueBoostNotification
): Promise<void> {
  if (!isLarkConfigured()) {
    logger.debug({ userId: data.userId }, 'Lark not configured, skipping queue boost notification');
    return;
  }
  try {
    const bot = getLarkBot();
    const card = buildQueueBoostCard(data);
    await bot.sendCard(LARK_CHAT_IDS.QUEUE_BOOST, card);

    logger.info(
      {
        userId: data.userId,
        creditsUsed: data.creditsUsed,
        promotedCount: data.promotedCount,
      },
      'Queue boost notification sent'
    );
  } catch (error) {
    logger.error({ error, data }, 'Failed to send queue boost notification');
  }
}

// Video generation notifications removed — module deleted

/**
 * 异步发送支付通知（fire-and-forget）
 */
export function asyncSendPaymentNotification(data: PaymentNotification): void {
  setImmediate(() => {
    void sendPaymentNotification(data);
  });
}

/**
 * 异步发送后端报警（fire-and-forget）
 */
export function asyncSendBackendAlert(data: BackendAlertNotification): void {
  setImmediate(() => {
    void sendBackendAlert(data);
  });
}

/**
 * 异步发送前端报警（fire-and-forget）
 */
export function asyncSendFrontendAlert(data: FrontendAlertNotification): void {
  setImmediate(() => {
    void sendFrontendAlert(data);
  });
}

/**
 * 异步发送 Prompt 滥用通知（fire-and-forget）
 */
export function asyncSendPromptAbuseNotification(data: PromptAbuseNotification): void {
  setImmediate(() => {
    void sendPromptAbuseNotification(data);
  });
}

/**
 * 异步发送队列加速通知（fire-and-forget）
 */
export function asyncSendQueueBoostNotification(data: QueueBoostNotification): void {
  setImmediate(() => {
    void sendQueueBoostNotification(data);
  });
}
