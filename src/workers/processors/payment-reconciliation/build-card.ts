import type { LarkCard } from "@/lib/lark";

function line(label: string, value: string): string {
  return `**${label}**: ${value}`;
}

function shortIds(ids: string[], max = 8): string {
  const head = ids.slice(0, max);
  const rest = ids.length - head.length;
  return rest > 0 ? `${head.join(", ")} (+${rest})` : head.join(", ");
}

export function buildPaymentReconciliationCard(params: {
  title: string;
  windowLabel: string;
  mentionMd?: string;
  stripe: {
    pendingCandidates: number;
    paidButStillPending: number;
    succeededButOrderNotFulfilled: number;
    samplePaymentIds: string[];
  };
  nowpayments: {
    pendingCandidates: number;
    checked: number;
    updatedToSucceeded: number;
    updatedToFailed: number;
    updatedToExpired: number;
    updatedToRefunded: number;
    stillPending: number;
    errors: number;
    finishedButStillPending: number;
    samplePaymentIds: string[];
  };
}): LarkCard {
  const content = [
    ...(params.mentionMd ? [params.mentionMd] : []),
    line("窗口", params.windowLabel),
    "",
    "**Stripe**",
    line("PENDING 候选(>5m)", String(params.stripe.pendingCandidates)),
    line("Stripe已支付但仍PENDING(只读检测)", String(params.stripe.paidButStillPending)),
    line("SUCCEEDED 但订单未履约", String(params.stripe.succeededButOrderNotFulfilled)),
    params.stripe.samplePaymentIds.length
      ? line("样本 Payment", shortIds(params.stripe.samplePaymentIds))
      : undefined,
    "",
    "**NowPayments**",
    line("PENDING 候选(>5m)", String(params.nowpayments.pendingCandidates)),
    line("已检查", String(params.nowpayments.checked)),
    line("→ SUCCEEDED", String(params.nowpayments.updatedToSucceeded)),
    line("→ FAILED", String(params.nowpayments.updatedToFailed)),
    line("→ EXPIRED", String(params.nowpayments.updatedToExpired)),
    line("→ REFUNDED", String(params.nowpayments.updatedToRefunded)),
    line("仍 PENDING", String(params.nowpayments.stillPending)),
    line("错误", String(params.nowpayments.errors)),
    line("finished但仍PENDING(只读检测)", String(params.nowpayments.finishedButStillPending)),
    params.nowpayments.samplePaymentIds.length
      ? line("样本 Payment", shortIds(params.nowpayments.samplePaymentIds))
      : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: params.title }, template: "blue" },
    elements: [{ tag: "div", text: { tag: "lark_md", content } }],
  };
}

export function buildPaymentReconciliationDailyCard(params: {
  title: string;
  windowLabel: string;
  mentionMd?: string;
  stripe: { successPayments: number; sumUsd: number; anomalies: number };
  nowpayments: { successPayments: number; sumUsd: number; anomalies: number };
  anomalyLines: string[];
}): LarkCard {
  const content = [
    ...(params.mentionMd ? [params.mentionMd] : []),
    line("窗口", params.windowLabel),
    "",
    "**Stripe(日)**",
    line("Success payments", String(params.stripe.successPayments)),
    line("金额(USD)", `$${params.stripe.sumUsd.toFixed(2)}`),
    line("异常数", String(params.stripe.anomalies)),
    "",
    "**NowPayments(日)**",
    line("Success payments", String(params.nowpayments.successPayments)),
    line("金额(USD)", `$${params.nowpayments.sumUsd.toFixed(2)}`),
    line("异常数", String(params.nowpayments.anomalies)),
    ...(params.anomalyLines.length ? ["", "**异常 Top**", ...params.anomalyLines] : []),
  ].join("\n");

  return {
    config: { wide_screen_mode: true },
    header: { title: { tag: "plain_text", content: params.title }, template: "orange" },
    elements: [{ tag: "div", text: { tag: "lark_md", content } }],
  };
}


