/**
 * 支付/积分埋点
 */

export const BILLING_EVENTS = {
  // 积分购买
  CREDITS_DIALOG_OPEN: "billing_credits_dialog_open",   // 打开充值弹窗
  CREDITS_PACKAGE_SELECT: "billing_credits_package_select", // 选择套餐
  CREDITS_CHECKOUT_START: "billing_credits_checkout_start", // 开始结账
  CREDITS_PURCHASE_SUCCESS: "billing_credits_purchase_success", // 购买成功（积分包 + 订阅统一 GMV 事件）
  
  // Paywall / 弹框曝光
  PAYWALL_VIEW: "billing_paywall_view", // paywall 弹框/抽屉曝光（如首次 blur 解锁弹框）
  PAYWALL_CLOSE: "billing_paywall_close", // paywall 关闭/取消

  // 订阅
  SUBSCRIPTION_UPGRADE_CLICK: "billing_subscription_upgrade_click",   // 点击升级 / 开始订阅结账
  SUBSCRIPTION_UPGRADE_SUCCESS: "billing_subscription_upgrade_success", // 订阅生效（成功扣款+履约）

  // Crypto checkout
  CRYPTO_CHECKOUT_VIEW: "billing_crypto_checkout_view", // 进入选币/数量页
  CRYPTO_CHECKOUT_SUBMIT: "billing_crypto_checkout_submit", // 点击继续创建 crypto 支付
  CRYPTO_CHECKOUT_RESULT: "billing_crypto_checkout_result", // 创建订单结果
  CRYPTO_PAYMENT_VIEW: "billing_crypto_payment_view", // 进入链上支付页
  CRYPTO_PAYMENT_STATUS: "billing_crypto_payment_status", // 链上支付状态变化
  CRYPTO_PAYMENT_ACTION: "billing_crypto_payment_action", // 链上支付页交互（copy/手动检查/展开二维码等）

  // 通用结账
  CHECKOUT_START: "billing_checkout_start", // 通用结账开始（含下载付费墙等）
} as const;

export interface BillingEventProperties {
  [BILLING_EVENTS.CREDITS_DIALOG_OPEN]: {
    source: "insufficient_credits" | "ip_limit" | "header" | "account";
    price_variant?: string | null;
    credits_pack_variant?: string | null;
    new_user_credits_variant?: string | null;
  };
  
  [BILLING_EVENTS.CREDITS_PACKAGE_SELECT]: {
    package_id: string;
    credits: number;
    price: number;
  };
  
  [BILLING_EVENTS.CREDITS_PURCHASE_SUCCESS]: {
    package_id: string;
    credits: number;
    price: number; // major unit (legacy)
    // Optional, enriched properties (server-side recommended)
    amount?: number; // major unit
    amount_cents?: number; // minor unit
    currency?: string;
    country_code?: string | null;
    gateway?: string;
    order_id?: string;
    payment_id?: string;
    product_type?: string;
    price_variant?: string | null;
    source?: string;
    // For multi-currency normalization (recommended)
    amount_usd?: number; // major unit, normalized to USD
    fx_rate_to_usd?: number;
    fx_source?: string;
    fx_at?: string; // ISO timestamp
  };

  [BILLING_EVENTS.CREDITS_CHECKOUT_START]: {
    package_id: string;
    price: number;
    credits?: number;
    product_type: "credits" | "subscription";
    source?: string;
    price_variant?: string | null;
    credits_pack_variant?: string | null;
    new_user_credits_variant?: string | null;
  };

  [BILLING_EVENTS.PAYWALL_VIEW]: {
    paywall: string;
    source?: string;
    variant?: string | null;
    // 首次触达（两种口径：本地/服务端计数）
    is_first_local?: boolean;
    is_first_server?: boolean;
    hit_paywall_count?: number;
    // 新用户优惠状态（如果可拿到）
    offer_state?: string | null;
    offer_is_eligible?: boolean;
    offer_started_at?: string | null;
    offer_ends_at?: string | null;
  };

  [BILLING_EVENTS.PAYWALL_CLOSE]: {
    paywall: string;
    source?: string;
    reason?: "dismiss" | "completed" | "navigate" | "unknown";
  };

  [BILLING_EVENTS.CHECKOUT_START]: {
    package_id: string;
    price: number;
    product_type: string;
    source?: string;
    video_id?: string;
    price_variant?: string | null;
  };

  [BILLING_EVENTS.SUBSCRIPTION_UPGRADE_CLICK]: {
    product_id: string;
    source: string;
    user_tier?: string;
  };

  [BILLING_EVENTS.CRYPTO_CHECKOUT_VIEW]: {
    product_id: string;
    from?: string;
    default_currency_id?: string;
  };

  [BILLING_EVENTS.CRYPTO_CHECKOUT_SUBMIT]: {
    product_id: string;
    gateway: "NOWPAYMENTS" | "STRIPE";
    currency_id?: string;
    quantity?: number;
    amount_usd?: number;
    from?: string;
  };

  [BILLING_EVENTS.CRYPTO_CHECKOUT_RESULT]: {
    product_id: string;
    gateway: "NOWPAYMENTS" | "STRIPE";
    status: "OK" | "CONFLICT" | "ERROR";
    order_id?: string;
    payment_id?: string;
    url?: string;
    message?: string;
    error?: string;
  };

  [BILLING_EVENTS.CRYPTO_PAYMENT_VIEW]: {
    payment_id: string;
    order_id?: string;
    from?: string;
  };

  [BILLING_EVENTS.CRYPTO_PAYMENT_STATUS]: {
    payment_id: string;
    order_id?: string;
    payment_status?: string;
    np_status?: string;
  };

  [BILLING_EVENTS.CRYPTO_PAYMENT_ACTION]: {
    payment_id: string;
    order_id?: string;
    action:
      | "copy_amount"
      | "copy_address"
      | "copy_hash"
      | "toggle_qr"
      | "manual_check_start"
      | "manual_check_detected"
      | "manual_check_timeout"
      | "manual_check_error";
    value?: string;
    show?: boolean;
  };
}
