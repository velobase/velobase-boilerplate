/**
 * 订单模块配置
 */

/**
 * 是否启用直接扣款模式（单次支付）
 * 
 * - true: 如果用户有已保存的卡，直接后台扣款，不跳转 Stripe Checkout
 * - false: 始终跳转 Stripe Checkout（回退模式）
 * 
 * 如果遇到合规问题或用户投诉，可以将此设为 false 回退到原有模式
 */
// TEMP: Disable Stripe direct charge due to elevated failure rate.
// When disabled, checkout will always fall back to Stripe Checkout (hosted) flow.
export const ENABLE_DIRECT_CHARGE = false;

/**
 * 是否在“支付成功（webhook/轮询/直扣）”后自动同步用户的默认支付偏好：
 * - AUTO -> STRIPE（用户用卡支付成功）
 * - AUTO -> NOWPAYMENTS（用户用币支付成功）
 *
 * 说明：
 * - 该逻辑会影响后续是否弹出支付方式选择框/是否自动跳转到某种支付方式
 * - 默认关闭，避免“所有用户被自动写默认支付方式”导致体验不可控
 * - 若要开启，请确保只在你确认需要该行为的环境/版本中启用
 */
export const ENABLE_PAYMENT_GATEWAY_PREFERENCE_AUTO_SYNC = false;

