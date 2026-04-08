export const PAYMENT_RECONCILIATION_THRESHOLDS = {
  // 任意 “已支付但未履约” 都值得 @
  succeededButNotFulfilled: 1,
  // PENDING 堆积
  pendingBacklog: 20,
  // 每小时 NowPayments 如果有终态更新，通常意味着 webhook 丢失/延迟（可按噪音再调）
  nowpaymentsTerminalUpdates: 3,
  // 每日异常
  dailyAnomalies: 1,
} as const;


