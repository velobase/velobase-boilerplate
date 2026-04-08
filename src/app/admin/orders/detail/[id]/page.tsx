"use client"

import { api } from "@/trpc/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  User,
  CreditCard,
  Calendar,
  Package,
  ExternalLink,
  Receipt,
  Activity
} from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  EXPIRED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

const paymentStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  SUCCESS: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(price / 100)
}

function formatDate(date: Date | string | null) {
  if (!date) return "-"
  return new Date(date).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export default function OrderDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: order, isLoading } = api.admin.getOrder.useQuery(
    { orderId: id },
    { enabled: !!id }
  )

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-red-500">Order not found</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Order Details
              <Badge className={cn("text-xs", statusColors[order.status] ?? "bg-gray-100")}>
                {order.status}
              </Badge>
            </h1>
            <p className="text-muted-foreground font-mono text-sm">{order.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/users/${order.userId}`}>
              <User className="h-4 w-4 mr-2" />
              View User
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-lg font-bold">{formatPrice(order.amount, order.currency)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="outline">{order.type}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expires At</p>
                <p className="font-medium">{formatDate(order.expiresAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated At</p>
                <p className="font-medium">{formatDate(order.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Product Name</p>
                  <p className="font-medium">{order.product.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product Type</p>
                  <Badge variant="secondary">{order.product.type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product ID</p>
                  <p className="text-xs font-mono">{order.productId}</p>
                </div>
              </div>

              {order.productSnapshot && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Snapshot at Purchase</p>
                  <div className="bg-muted p-3 rounded-md overflow-x-auto">
                    <pre className="text-xs">{JSON.stringify(order.productSnapshot, null, 2)}</pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {order.payments.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No payments found</p>
              ) : (
                <div className="space-y-4">
                  {order.payments.map((payment) => (
                    <div key={payment.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{payment.id}</span>
                          <Badge className={cn("text-xs", paymentStatusColors[payment.status] ?? "bg-gray-100")}>
                            {payment.status}
                          </Badge>
                        </div>
                        <span className="font-bold">{formatPrice(payment.amount, payment.currency)}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Gateway:</span> {payment.paymentGateway}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span> {formatDate(payment.createdAt)}
                        </div>
                        {payment.gatewayTransactionId && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Transaction ID:</span> 
                            <span className="font-mono ml-1">{payment.gatewayTransactionId}</span>
                          </div>
                        )}
                        {payment.gatewaySubscriptionId && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Subscription ID:</span> 
                            <span className="font-mono ml-1">{payment.gatewaySubscriptionId}</span>
                          </div>
                        )}
                      </div>

                      {(payment.gatewayResponse || payment.extra) && (
                         <div className="mt-2">
                           <details className="text-xs">
                             <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw Data</summary>
                             <div className="mt-2 space-y-2">
                               {payment.gatewayResponse && (
                                 <div>
                                   <p className="font-semibold">Gateway Response:</p>
                                   <pre className="bg-muted p-2 rounded overflow-x-auto">
                                     {JSON.stringify(payment.gatewayResponse, null, 2)}
                                   </pre>
                                 </div>
                               )}
                               {payment.extra && (
                                 <div>
                                   <p className="font-semibold">Extra Data:</p>
                                   <pre className="bg-muted p-2 rounded overflow-x-auto">
                                     {JSON.stringify(payment.extra, null, 2)}
                                   </pre>
                                 </div>
                               )}
                             </div>
                           </details>
                         </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-4">
                {order.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={order.user.image} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="font-medium truncate">{order.user.name || "No name"}</p>
                  <p className="text-sm text-muted-foreground truncate">{order.user.email}</p>
                </div>
              </div>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/admin/users/${order.userId}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View User Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Timeline / Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-green-100 p-1 rounded-full dark:bg-green-900">
                  <Calendar className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-blue-100 p-1 rounded-full dark:bg-blue-900">
                  <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

