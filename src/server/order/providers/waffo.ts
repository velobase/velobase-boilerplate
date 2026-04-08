import { BaseWebhookResult, type PaymentProvider } from "./types";
import { waffoPaymentWebhookSchema, waffoSubscriptionWebhookSchema } from "../schemas/webhook";

// 占位实现：创建支付/订阅阶段交由上游系统（如 Waffo 控制台）生成链接
export const waffoProvider: PaymentProvider = {
  async createPayment() {
    throw new Error("Waffo does not support client-created payment sessions in TS backend");
  },

  async createSubscription() {
    throw new Error("Waffo does not support client-created subscription sessions in TS backend");
  },

  async handlePaymentWebhook(req: Request) {
    const body = await req.text();
    try {
      const parsed = JSON.parse(body) as unknown;
      const data = waffoPaymentWebhookSchema.parse(parsed);
      const status = mapWaffoStatus(data.status);
      return new BaseWebhookResult({
        status,
        gatewayTransactionId: data.transaction_id,
        gatewaySubscriptionId: data.subscription_id,
        subscriptionPeriod: data.subscription_period ?? 0,
        amount: data.amount_cents,
        currency: data.currency,
        rawData: data,
      });
    } catch {
      return null;
    }
  },

  async handleSubscriptionWebhook(req: Request) {
    const body = await req.text();
    try {
      const parsed = JSON.parse(body) as unknown;
      const data = waffoSubscriptionWebhookSchema.parse(parsed);
      const status = mapWaffoSubscriptionStatus(data.subscription_status);
      return new BaseWebhookResult({
        status,
        gatewaySubscriptionId: data.subscription_id,
        rawData: data,
        isSubscription: true,
      });
    } catch {
      return null;
    }
  },
};

function mapWaffoStatus(status?: string) {
  switch ((status ?? "").toUpperCase()) {
    case "SUCCEEDED":
    case "SUCCESS":
      return "SUCCEEDED" as const;
    case "FAILED":
      return "FAILED" as const;
    case "PENDING":
      return "PENDING" as const;
    default:
      return "FAILED" as const;
  }
}

function mapWaffoSubscriptionStatus(status?: string) {
  switch ((status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "SUCCEEDED" as const;
    case "EXPIRED":
      return "EXPIRED" as const;
    case "CANCELLED":
    case "CLOSED":
      return "FAILED" as const;
    default:
      return "FAILED" as const;
  }
}


