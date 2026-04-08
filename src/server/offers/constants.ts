export const NEW_USER_UNLOCK_OFFER = {
  type: 'NEW_USER_UNLOCK' as const,
  // 倒计时：从首次触发付费墙开始计时
  durationMs: 60 * 60 * 1000,
  // 资格：按“未购买用户首次触发付费墙”计算（不再限制账号创建时间）
  // 仅保留字段做兼容（历史代码/配置引用），不作为资格判断依据。
  eligibilityMs: 24 * 60 * 60 * 1000,
  discountedProductId: 'prod-unlock-weekly-499',
  // 标准价周付（锚点/到期后 fallback）
  standardProductId: 'prod-unlock-weekly-999',
} as const;

export type NewUserUnlockOfferType = typeof NEW_USER_UNLOCK_OFFER.type;


