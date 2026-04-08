/**
 * Lark 常量配置
 */

// Lark Chat IDs (国际版)
export const LARK_CHAT_IDS = {
  /** UBot 群 - 用户视频作品通知 */
  VIDEO_WORKS: 'oc_d34ef9198db41a2adaeee5a7c21dd3ba',
  /** UBot支付群 - 支付相关通知 */
  PAYMENT: 'oc_06aa4f76e5aa155593e38174565a604f',
  /** Ubot支付失败 - 支付失败通知 */
  PAYMENT_FAILED: 'oc_f5fecab58328be83315a68dc3d68cd7c',
  /**
   * UBot订阅群 - 订阅续费/扣款相关通知
   * 默认复用支付群，方便未建群时不丢通知；如需分流可替换为独立 chat_id
   */
  SUBSCRIPTION: 'oc_06aa4f76e5aa155593e38174565a604f',
  /**
   * UBot订阅失败 - 订阅扣款失败通知
   * 默认复用支付失败群；如需分流可替换为独立 chat_id
   */
  SUBSCRIPTION_FAILED: 'oc_f5fecab58328be83315a68dc3d68cd7c',
  /** Ubot风控 - 风控相关报警（prompt滥用、邮件滥用等） */
  RISK_CONTROL: 'oc_486583ac8e0657748cfca1b93fcab3e9',
  /** Ubot报警（前端） - 前端报警 */
  ALERT_FRONTEND: 'oc_78f6797f1194f66e27b099b42797ff9c',
  /** UBot加速 - 队列加速通知 */
  QUEUE_BOOST: 'oc_2aec59be79c7bb14830c875a82c83421',
  /** Ubot报警 - 后端报警 */
  ALERT_BACKEND: 'oc_6752e3b3854a5af7874379111e557ae9',
  /** Ubot业务指标 - 注册转化率异常报警（小时） */
  CONVERSION_ALERT: 'oc_8be1d95350d8ee161f007e2d804fd65a',
  /** Ubot业务指标 - 每日汇总（天） */
  CONVERSION_ALERT_DAILY: 'oc_7021f1a452d6d9e893bb900c9ba72aec',
  /** UBot对账 - WaveSpeed & Credits 对账报表（小时/天） */
  BILLING_RECONCILIATION: 'oc_0dc237cf8cb8be05fd66e2e09da1470a',
  /** Ubot争议 - Stripe EFW/Dispute 争议预警通知 */
  DISPUTE: 'oc_1d463e2e4e8451a9cccc051f7027b3ed',
  /** UBot客诉 - AI 客服助理审核通知 */
  SUPPORT: 'oc_b4e32ac06eb5733e47f6caed1850c6e8'
} as const;

// 飞书 Chat IDs (国内版)
export const FEISHU_CHAT_IDS = {
  /** 支付宝到账 - 支付通知 */
  PAYMENT: 'oc_1a790c6fc926cb682a04bc1f61c882b1',
} as const;

export type LarkChatId = (typeof LARK_CHAT_IDS)[keyof typeof LARK_CHAT_IDS];
export type FeishuChatId = (typeof FEISHU_CHAT_IDS)[keyof typeof FEISHU_CHAT_IDS];

