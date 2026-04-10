/**
 * Lark 消息类型定义
 */

// Webhook 消息类型
export type WebhookMsgType = 'text' | 'post' | 'image' | 'interactive';

// Webhook 文本消息
export interface WebhookTextMessage {
  msg_type: 'text';
  content: {
    text: string;
  };
}

// Webhook 富文本消息
export interface WebhookPostMessage {
  msg_type: 'post';
  content: {
    post: {
      zh_cn?: PostContent;
      en_us?: PostContent;
    };
  };
}

export interface PostContent {
  title: string;
  content: PostElement[][];
}

export type PostElement =
  | PostTextElement
  | PostLinkElement
  | PostAtElement
  | PostImageElement;

export interface PostTextElement {
  tag: 'text';
  text: string;
}

export interface PostLinkElement {
  tag: 'a';
  text: string;
  href: string;
}

export interface PostAtElement {
  tag: 'at';
  user_id: string;
  user_name?: string;
}

export interface PostImageElement {
  tag: 'img';
  image_key: string;
}

// Webhook 图片消息
export interface WebhookImageMessage {
  msg_type: 'image';
  content: {
    image_key: string;
  };
}

// Webhook 卡片消息
export interface WebhookInteractiveMessage {
  msg_type: 'interactive';
  card: LarkCard;
}

export type WebhookMessage =
  | WebhookTextMessage
  | WebhookPostMessage
  | WebhookImageMessage
  | WebhookInteractiveMessage;

// Lark 卡片定义
export interface LarkCard {
  config?: LarkCardConfig;
  header?: LarkCardHeader;
  elements: LarkElement[];
}

export interface LarkCardConfig {
  wide_screen_mode?: boolean;
  enable_forward?: boolean;
}

export interface LarkCardHeader {
  title: LarkText;
  template?: LarkHeaderTemplate;
}

export type LarkHeaderTemplate =
  | 'blue'
  | 'wathet'
  | 'turquoise'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'carmine'
  | 'violet'
  | 'purple'
  | 'indigo'
  | 'grey';

export interface LarkText {
  tag: 'plain_text' | 'lark_md';
  content: string;
}

// 卡片元素
export type LarkElement =
  | LarkDivElement
  | LarkMarkdownElement
  | LarkImageElement
  | LarkNoteElement
  | LarkHrElement
  | LarkActionElement
  | LarkChartElement
  | LarkTableElement;

export interface LarkTableElement {
  tag: 'table';
  page_size?: number;
  row_height?: 'low' | 'medium' | 'high';
  header_style?: {
    text_align?: 'left' | 'center' | 'right';
    text_size?: 'normal' | 'large';
    background_style?: 'grey' | 'none' | 'colour';
    bold?: boolean;
    lines?: number;
  };
  columns: {
    name: string;
    display_name: string;
    data_type?: 'text' | 'options' | 'number';
    align?: 'left' | 'center' | 'right';
    width?: 'auto' | 'fixed'; // 实际上 Lark 目前主要支持 auto
    format?: Record<string, unknown>;
  }[];
  rows: Record<string, unknown>[];
}

export interface LarkChartElement {
  tag: 'chart';
  chart_spec: Record<string, unknown>;
  height?: string;
}

export interface LarkDivElement {
  tag: 'div';
  text?: LarkText;
  fields?: LarkField[];
  extra?: LarkActionButton | LarkOverflowButton;
}

export interface LarkMarkdownElement {
  tag: 'markdown';
  content: string;
}

export interface LarkImageElement {
  tag: 'img';
  img_key: string;
  alt: LarkText;
  title?: LarkText;
}

export interface LarkNoteElement {
  tag: 'note';
  elements: (LarkText | { tag: 'img'; img_key: string; alt: LarkText })[];
}

export interface LarkHrElement {
  tag: 'hr';
}

export interface LarkActionElement {
  tag: 'action';
  actions: (LarkActionButton | LarkOverflowButton)[];
}

export interface LarkField {
  is_short: boolean;
  text: LarkText;
}

export interface LarkActionButton {
  tag: 'button';
  text: LarkText;
  url?: string;
  type?: 'default' | 'primary' | 'danger';
  value?: Record<string, unknown>;
}

export interface LarkOverflowButton {
  tag: 'overflow';
  options: {
    text: LarkText;
    value: string;
  }[];
}

// Bot API 相关类型
export interface LarkBotConfig {
  appId: string;
  appSecret: string;
  /** 使用飞书 (中国) 而非 Lark (海外) */
  useFeishu?: boolean;
  /** 事件回调加密 Key (Encrypt Key) */
  encryptKey?: string;
  /** 事件回调验证 Token (Verification Token) */
  verificationToken?: string;
}

export interface LarkAccessToken {
  tenant_access_token: string;
  expire: number;
}

export interface LarkSendMessageRequest {
  receive_id: string;
  msg_type: string;
  content: string;
}

export interface LarkSendMessageResponse {
  code: number;
  msg: string;
  data?: {
    message_id: string;
  };
}

export interface LarkUploadImageResponse {
  code: number;
  msg: string;
  data?: {
    image_key: string;
  };
}

// Webhook 响应
export interface WebhookResponse {
  code?: number;
  msg?: string;
  StatusCode?: number;
  StatusMessage?: string;
}

// 通知数据类型
export interface PaymentNotification {
  /**
   * 业务类型：
   * - order: 普通订单支付（一次性/开通订阅等有 Order 的场景）
   * - subscription: 订阅续费/订阅扣款失败（通常没有 Order）
   */
  bizType?: 'order' | 'subscription';
  /**
   * 订阅事件类型（bizType=subscription 时可选）
   * - renewal: 订阅续费成功（含提前转正）
   * - invoice_failed: 订阅扣款失败（invoice.payment_failed）
   */
  subscriptionEvent?: 'renewal' | 'invoice_failed';
  /** 订阅第几个周期（更贴近业务的 cycle 序号，非 Stripe 的 billing cycle 概念） */
  subscriptionCycleNumber?: number;
  /** 订阅本期开始时间（ISO 字符串） */
  subscriptionPeriodStart?: string;
  /** 订阅本期结束时间（ISO 字符串） */
  subscriptionPeriodEnd?: string;
  /** Stripe invoice.billing_reason 等（可选） */
  subscriptionBillingReason?: string;
  /** Stripe invoice.attempt_count 等（可选） */
  subscriptionAttemptCount?: number;
  /** Stripe invoice.next_payment_attempt（可选，ISO 字符串） */
  subscriptionNextPaymentAttemptAt?: string;
  /** 用户名或邮箱 */
  userName: string;
  /** 用户邮箱（可选） */
  userEmail?: string;
  /** 用户国家代码 (ISO 3166-1 alpha-2, e.g. "US", "GB") */
  userCountryCode?: string;
  /** 金额（分） */
  amountCents: number;
  /** 货币 */
  currency: string;
  /** 产品名称 */
  productName: string;
  /** 订单 ID */
  orderId: string;
  /** 支付网关 */
  gateway: 'stripe' | 'nowpayments' | 'other';
  /** Payment ID（本系统 payment.id，可选） */
  paymentId?: string;
  /** 网关交易 ID（Stripe payment_intent / NowPayments payment_id 等，可选） */
  gatewayTransactionId?: string;
  /** 网关订阅 ID（订阅续费/订阅开通时可选） */
  gatewaySubscriptionId?: string;
  /** 支付跳转链接（可选，用于卡片按钮直达） */
  paymentUrl?: string;
  /** NowPayments / Crypto 相关字段（可选，避免卡片只支持 Stripe） */
  nowpayments?: {
    payment_id?: string;
    payment_status?: string;
    pay_address?: string | null;
    pay_amount?: number | string | null;
    pay_currency?: string | null;
    payin_hash?: string | null;
    payout_hash?: string | null;
    price_amount?: number | string | null;
    price_currency?: string | null;
  };
  /** 支付状态 */
  status: 'succeeded' | 'failed' | 'pending';
  /** 失败原因（失败时） */
  failureReason?: string;
  /** 是否为测试环境 */
  isTest?: boolean;

  // --- 增强信息 ---
  /** 获得的积分数 */
  credits?: number;
  /** 原价（分），用于计算折扣 */
  originalAmountCents?: number;
  /** UTM 信息 */
  utm?: {
    source?: string;
    campaign?: string;
    medium?: string;
  };
  /** 用户统计信息 */
  userStats?: {
    /** 是否首单 */
    isFirstOrder?: boolean;
    /** 累计消费（分），包含本单 */
    totalSpentCents?: number;
  };
  /** 是否为免费试用开通（实际支付 $0） */
  isTrial?: boolean;
  /** 试用天数 */
  trialDays?: number;
  /** 推荐人信息（被谁推荐） */
  referredBy?: {
    /** 推荐人名称或邮箱 */
    name?: string;
    /** 推荐人邮箱 */
    email?: string;
  };
}
