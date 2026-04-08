"use client"

import { Fragment } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { ChevronDown, ChevronUp } from "lucide-react"
import { statusConfig, typeLabels, formatPrice, formatDateTime } from "./utils"
import { PaymentDetails } from "./payment-details"
import type { OrderItem } from "./types"

interface OrderRowProps {
  order: OrderItem
  isExpanded: boolean
  onToggleExpand: () => void
}

export function OrderRow({ order, isExpanded, onToggleExpand }: OrderRowProps) {
  return (
    <Fragment>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onToggleExpand}>
        <TableCell>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-mono text-xs">
          <Link 
            href={`/admin/orders/detail/${order.id}`} 
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {order.id.slice(0, 8)}...
          </Link>
        </TableCell>
        <TableCell>
          <div className="min-w-0">
            <p className="truncate text-sm">{order.user.name || order.user.email}</p>
            <p className="text-xs text-muted-foreground truncate">{order.user.email}</p>
          </div>
        </TableCell>
        <TableCell>
          <div className="min-w-0">
            <p className="truncate text-sm">{order.product.name}</p>
            <Badge variant="outline" className="text-[10px]">
              {order.product.type === "SUBSCRIPTION" ? "订阅" : order.product.type === "CREDITS_PACKAGE" ? "积分包" : "权益"}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="font-medium">
          {formatPrice(order.amount, order.currency)}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">
            {typeLabels[order.type] || order.type}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant={statusConfig[order.status]?.variant ?? "outline"} className="text-xs">
            {statusConfig[order.status]?.label || order.status}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="text-xs text-muted-foreground">
            {order.payments.length} 次
          </span>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatDateTime(order.createdAt)}
        </TableCell>
      </TableRow>
      {isExpanded && order.payments.length > 0 && (
        <PaymentDetails payments={order.payments} currency={order.currency} />
      )}
    </Fragment>
  )
}

