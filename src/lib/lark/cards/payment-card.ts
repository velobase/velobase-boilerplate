import type { LarkCard, LarkElement, PaymentNotification } from '../types';

function truncateMiddle(
  value: string | undefined | null,
  head = 10,
  tail = 10
): string | undefined {
  if (!value) return undefined;
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function formatCryptoCurrency(code?: string | null): string | undefined {
  if (!code) return undefined;
  const c = code.toLowerCase();
  if (c === 'usdttrc20') return 'USDT (TRON)';
  if (c === 'usdtbsc') return 'USDT (BSC)';
  if (c === 'usdt') return 'USDT (ETH)';
  if (c === 'usdc') return 'USDC (ETH)';
  return code.toUpperCase();
}

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CHF: 'CHF ',
  CNY: '¥',
  JPY: '¥',
};

function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
}

// Country code to name/flag mapping
const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
  US: { name: 'United States', flag: '🇺🇸' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  FR: { name: 'France', flag: '🇫🇷' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  IT: { name: 'Italy', flag: '🇮🇹' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },
  BE: { name: 'Belgium', flag: '🇧🇪' },
  AT: { name: 'Austria', flag: '🇦🇹' },
  CH: { name: 'Switzerland', flag: '🇨🇭' },
  SE: { name: 'Sweden', flag: '🇸🇪' },
  NO: { name: 'Norway', flag: '🇳🇴' },
  DK: { name: 'Denmark', flag: '🇩🇰' },
  FI: { name: 'Finland', flag: '🇫🇮' },
  PL: { name: 'Poland', flag: '🇵🇱' },
  CA: { name: 'Canada', flag: '🇨🇦' },
  AU: { name: 'Australia', flag: '🇦🇺' },
  NZ: { name: 'New Zealand', flag: '🇳🇿' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  KR: { name: 'South Korea', flag: '🇰🇷' },
  CN: { name: 'China', flag: '🇨🇳' },
  HK: { name: 'Hong Kong', flag: '🇭🇰' },
  TW: { name: 'Taiwan', flag: '🇹🇼' },
  SG: { name: 'Singapore', flag: '🇸🇬' },
  MY: { name: 'Malaysia', flag: '🇲🇾' },
  TH: { name: 'Thailand', flag: '🇹🇭' },
  VN: { name: 'Vietnam', flag: '🇻🇳' },
  ID: { name: 'Indonesia', flag: '🇮🇩' },
  PH: { name: 'Philippines', flag: '🇵🇭' },
  IN: { name: 'India', flag: '🇮🇳' },
  AE: { name: 'UAE', flag: '🇦🇪' },
  SA: { name: 'Saudi Arabia', flag: '🇸🇦' },
  IL: { name: 'Israel', flag: '🇮🇱' },
  TR: { name: 'Turkey', flag: '🇹🇷' },
  RU: { name: 'Russia', flag: '🇷🇺' },
  UA: { name: 'Ukraine', flag: '🇺🇦' },
  BR: { name: 'Brazil', flag: '🇧🇷' },
  MX: { name: 'Mexico', flag: '🇲🇽' },
  AR: { name: 'Argentina', flag: '🇦🇷' },
  ZA: { name: 'South Africa', flag: '🇿🇦' },
};

function getCountryDisplay(code?: string): string | undefined {
  if (!code) return undefined;
  const info = COUNTRY_INFO[code.toUpperCase()];
  if (info) return `${info.flag} ${info.name}`;
  // Fallback: generate flag emoji from country code
  const flag = code.length === 2
    ? String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)))
    : '';
  return `${flag} ${code.toUpperCase()}`;
}

function formatIsoDate(iso?: unknown): string | undefined {
  if (typeof iso !== 'string' || !iso) return undefined;
  // Best-effort: show YYYY-MM-DD HH:mm (or YYYY-MM-DD if time missing)
  if (iso.length >= 16) return iso.replace('T', ' ').slice(0, 16);
  if (iso.length >= 10) return iso.slice(0, 10);
  return iso;
}

/**
 * 构建支付通知卡片
 */
export function buildPaymentCard(data: PaymentNotification): LarkCard {
  const isSubscription = data.bizType === 'subscription';

  // 试用开通使用特殊状态
  const statusInfo = data.isTrial
    ? { emoji: '🎁', text: '试用开通' }
    : isSubscription
      ? {
          succeeded: { emoji: '🔁', text: '订阅续费成功' },
          failed: { emoji: '🔁', text: '订阅扣款失败' },
          pending: { emoji: '🔁', text: '订阅扣款处理中' },
        }[data.status]
      : {
          succeeded: { emoji: '✅', text: '支付成功' },
          failed: { emoji: '❌', text: '支付失败' },
          pending: { emoji: '⏳', text: '支付处理中' },
        }[data.status];

  const elements: LarkElement[] = [];
  // 试用时显示 0.00，否则显示实际金额
  const displayAmountCents = data.isTrial ? 0 : data.amountCents;
  const amountStr = (displayAmountCents / 100).toFixed(2);
  const currency = data.currency.toUpperCase();
  const currencySymbol = getCurrencySymbol(currency);

  // --- 核心信息区 ---
  const coreInfoLines: string[] = [];
  
  // 试用开通显示试用信息
  if (data.isTrial) {
    coreInfoLines.push(`🎁 **试用**: ${data.trialDays ?? 7} 天免费`);
    coreInfoLines.push(`💰 **续费价**: ${currencySymbol}${(data.amountCents / 100).toFixed(2)} ${currency}`);
  } else {
    coreInfoLines.push(`💰 **金额**: ${currencySymbol}${amountStr} ${currency}`);
    
    // 如果是 Crypto 支付，在主金额下方展示实际入账 (Received)
    if (data.gateway === 'nowpayments' && data.nowpayments) {
      const np = data.nowpayments;
      const payCur = formatCryptoCurrency(np.pay_currency);
      
      if (np.pay_amount != null && payCur) {
        coreInfoLines.push(`🪙 **实收**: **${np.pay_amount} ${payCur}**`);
      }
      
      if (np.payment_status) {
         const statusMap: Record<string, string> = {
          finished: '✅ 已完成',
          confirmed: '✅ 已确认',
          confirming: '⏳ 确认中',
          sending: '📤 发送中',
          failed: '❌ 失败',
          refunded: '↩️ 已退款',
          expired: '⚠️ 已过期',
        };
        const displayStatus = statusMap[np.payment_status.toLowerCase()] || np.payment_status;
        coreInfoLines.push(`📡 **状态**: ${displayStatus} (链上)`);
      }
      
      if (np.payin_hash) {
        coreInfoLines.push(`🔗 **哈希**: \`${truncateMiddle(np.payin_hash, 8, 8)}\``);
      }
    }
  }
  coreInfoLines.push(`📦 **产品**: ${data.productName}`);

  // 订阅场景：更显眼地展示订阅 ID（避免只在底部 note 里）
  if (isSubscription && data.gatewaySubscriptionId) {
    coreInfoLines.push(`🔁 **订阅ID**: \`${truncateMiddle(data.gatewaySubscriptionId, 12, 12)}\``);
  }

  // 订阅场景：周期/时间窗/重试信息（管理员关心）
  if (isSubscription) {
    if (typeof data.subscriptionCycleNumber === 'number') {
      coreInfoLines.push(`🔢 **周期**: 第 ${data.subscriptionCycleNumber} 期`);
    }
    const start = formatIsoDate(data.subscriptionPeriodStart);
    const end = formatIsoDate(data.subscriptionPeriodEnd);
    if (start || end) {
      coreInfoLines.push(`📆 **本期**: ${start ?? 'unknown'} ~ ${end ?? 'unknown'}`);
    }
    if (data.subscriptionBillingReason) {
      coreInfoLines.push(`🧾 **原因**: ${data.subscriptionBillingReason}`);
    }
    if (typeof data.subscriptionAttemptCount === 'number') {
      coreInfoLines.push(`🔄 **尝试次数**: ${data.subscriptionAttemptCount}`);
    }
    const nextAttempt = formatIsoDate(data.subscriptionNextPaymentAttemptAt);
    if (nextAttempt) {
      coreInfoLines.push(`⏭️ **下次重试**: ${nextAttempt}`);
    }
  }

  // 积分展示
  if (data.credits) {
    coreInfoLines.push(`💎 **积分**: +${data.credits}`);
  }

  // 折扣展示
  if (data.originalAmountCents && data.originalAmountCents > data.amountCents) {
    const originalStr = (data.originalAmountCents / 100).toFixed(2);
    const savedStr = ((data.originalAmountCents - data.amountCents) / 100).toFixed(2);
    coreInfoLines.push(`🏷️ **优惠**: ${currencySymbol}${savedStr} (原价: ${currencySymbol}${originalStr})`);
  }

  elements.push({
    tag: 'markdown',
    content: coreInfoLines.join('\n'),
  });

  elements.push({ tag: 'hr' });

  // --- 用户详情区 ---
  const userLines = [`👤 **用户**: ${data.userName}`];
  if (data.userEmail && data.userEmail !== data.userName) {
    userLines.push(`📧 **邮箱**: ${data.userEmail}`);
  }

  // 用户国家
  const countryDisplay = getCountryDisplay(data.userCountryCode);
  if (countryDisplay) {
    userLines.push(`🌍 **国家**: ${countryDisplay}`);
  }

  // 推荐人信息
  if (data.referredBy) {
    const referrerDisplay = data.referredBy.name ?? data.referredBy.email ?? '未知';
    userLines.push(`🤝 **推荐人**: ${referrerDisplay}`);
  }

  // 用户价值标签
  const tags: string[] = [];
  if (data.userStats) {
    if (data.userStats.isFirstOrder) tags.push('🆕 首单');
    else tags.push('↩️ 复购');

    if (data.userStats.totalSpentCents) {
      const totalSpent = (data.userStats.totalSpentCents / 100).toFixed(2);
      // LTV 使用 USD，因为是跨货币累计
      tags.push(`💰 LTV: $${totalSpent}`);
    }
  }
  if (tags.length > 0) {
    userLines.push(`📊 **标签**: ${tags.join(' | ')}`);
  }

  // 来源追踪
  if (data.utm && (data.utm.source || data.utm.campaign)) {
    const sources: string[] = [];
    if (data.utm.source) sources.push(data.utm.source);
    if (data.utm.campaign) sources.push(data.utm.campaign);
    userLines.push(`📡 **来源**: ${sources.join(' / ')}`);
  }

  elements.push({
    tag: 'markdown',
    content: userLines.join('\n'),
  });

  // --- 错误区 ---
  if (data.status === 'failed' && data.failureReason) {
    elements.push({ tag: 'hr' });
    elements.push({
      tag: 'markdown',
      content: `❌ **失败原因**: ${data.failureReason}`,
    });
  }

  // --- 底部技术信息 ---
  elements.push({ tag: 'hr' });
  const bizIdLabel = isSubscription ? '🆔 订阅事件' : '🆔 订单';
  const metaInfo = [
    `${bizIdLabel}: ${data.orderId}`,
    data.paymentId ? `🧾 支付: ${data.paymentId}` : undefined,
    `💳 网关: ${data.gateway.toUpperCase()}`,
    data.gatewayTransactionId ? `🔁 交易: ${truncateMiddle(data.gatewayTransactionId, 10, 10)}` : undefined,
    data.gatewaySubscriptionId ? `🔁 订阅: ${truncateMiddle(data.gatewaySubscriptionId, 10, 10)}` : undefined,
    data.isTest ? `🧪 环境: TEST` : `🚀 环境: PROD`,
  ].filter(Boolean) as string[];
  
  elements.push({
    tag: 'note',
    elements: [
      {
        tag: 'plain_text',
        content: metaInfo.join(' | '),
      },
    ],
  });

  // 首单/复购标记（订阅必然是复购，不显示）
  const userTag = !isSubscription && data.userStats
    ? (data.userStats.isFirstOrder ? '首单 ' : '复购 ')
    : '';

  let title = data.isTrial
    ? `${statusInfo.emoji} ${userTag}${statusInfo.text} (${data.trialDays ?? 7} days)`
    : `${statusInfo.emoji} ${userTag}${statusInfo.text} - ${currencySymbol}${amountStr}`;

  // 如果是 Crypto 支付，标题增加标识
  if (data.gateway === 'nowpayments') {
     title = `🪙 ${title} (Crypto)`;
  }

  if (data.isTest) {
    title = `🧪 ${title}`;
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      template: data.status === 'failed' ? 'red' : 'blue',
      title: {
        tag: 'plain_text',
        content: title,
      },
    },
    elements,
  };
}
