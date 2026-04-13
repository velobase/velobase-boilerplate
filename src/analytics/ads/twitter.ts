declare global {
  interface Window {
    twq?: (command: string, eventId: string, params?: TwitterConversionParams) => void;
  }
}

interface TwitterConversionParams {
  value?: number | null;
  currency?: string | null;
  contents?: TwitterContentItem[];
  conversion_id?: string | null;
  email_address?: string | null;
  phone_number?: string | null;
}

interface TwitterContentItem {
  content_type?: string | null;
  content_id?: string | null;
  content_name?: string | null;
  content_price?: number | null;
  num_items?: number | null;
  content_group_id?: string | null;
}

/**
 * 发送 Twitter 转化事件
 * @param eventId - 完整的事件 ID，如 'tw-qv3gm-qv3gn'
 * @param params - 转化参数
 */
export function trackTwitterConversion(
  eventId: string,
  params?: TwitterConversionParams
): void {
  if (typeof window !== "undefined" && window.twq) {
    window.twq("event", eventId, params);
  }
}

/**
 * 追踪购买转化
 */
export function trackTwitterPurchase(params: {
  orderId: string;
  value: number;
  currency?: string;
  email?: string;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}): void {
  trackTwitterConversion("tw-qv3gm-qv3gn", {
    value: params.value,
    currency: params.currency ?? "USD",
    conversion_id: params.orderId,
    email_address: params.email,
    contents: params.items?.map((item) => ({
      content_id: item.id,
      content_name: item.name,
      content_price: item.price,
      num_items: item.quantity,
    })),
  });
}
