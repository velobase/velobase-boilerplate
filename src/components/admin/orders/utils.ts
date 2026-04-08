export const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "待支付", variant: "outline" },
  COMPLETED: { label: "已完成", variant: "default" },
  CANCELLED: { label: "已取消", variant: "secondary" },
  EXPIRED: { label: "已过期", variant: "destructive" },
}

export const typeLabels: Record<string, string> = {
  NEW_PURCHASE: "新购",
  RENEWAL: "续费",
  UPGRADE: "升级",
}

export const paymentStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "待支付", variant: "outline" },
  SUCCESS: { label: "成功", variant: "default" },
  FAILED: { label: "失败", variant: "destructive" },
  CANCELLED: { label: "取消", variant: "secondary" },
}

export function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(price / 100)
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

