import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { paymentStatusConfig, formatPrice, formatDateTime } from "./utils"
import type { PaymentItem } from "./types"

interface PaymentDetailsProps {
  payments: PaymentItem[]
  currency: string
}

export function PaymentDetails({ payments, currency }: PaymentDetailsProps) {
  if (payments.length === 0) return null

  return (
    <TableRow className="bg-muted/20">
      <TableCell colSpan={9} className="p-0">
        <div className="p-4">
          <h4 className="text-sm font-medium mb-2">支付记录 ({payments.length})</h4>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-background rounded-md border"
              >
                <div className="flex items-center gap-4">
                  <div className="font-mono text-xs text-muted-foreground">
                    {payment.id.slice(0, 8)}...
                  </div>
                  <Badge variant={paymentStatusConfig[payment.status]?.variant ?? "outline"} className="text-xs">
                    {paymentStatusConfig[payment.status]?.label || payment.status}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatPrice(payment.amount, currency)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {payment.paymentGateway}
                  </span>
                  {payment.isSubscription && (
                    <Badge variant="secondary" className="text-xs">订阅</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {payment.gatewayTransactionId && (
                    <span className="font-mono text-xs text-muted-foreground">
                      TX: {payment.gatewayTransactionId.slice(0, 12)}...
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(payment.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}

