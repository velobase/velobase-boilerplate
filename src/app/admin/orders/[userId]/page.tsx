"use client"

import { OrdersTable } from "@/components/admin/orders/orders-table"
import { useParams } from "next/navigation"

export default function UserOrdersPage() {
  const params = useParams()
  const userId = params.userId as string

  return <OrdersTable userId={userId} />
}

