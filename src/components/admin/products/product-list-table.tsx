import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ProductPriceCell } from "./product-price-cell"
import type { RouterOutputs } from "@/trpc/react"

type Product = RouterOutputs["admin"]["listProducts"]["items"][number]

interface ProductListTableProps {
  isLoading: boolean
  products: Product[]
  pageSize: number
  onToggleAvailability: (productId: string) => void
  isToggling: boolean
  onViewDetail: (product: Product) => void
}

const typeLabels: Record<string, string> = {
  SUBSCRIPTION: "订阅",
  CREDITS_PACKAGE: "积分包",
  ONE_TIME_ENTITLEMENT: "一次性权益",
  UNDEFINED: "未定义",
}

const statusLabels: Record<string, string> = {
  ACTIVE: "启用",
  INACTIVE: "停用",
  UNDEFINED: "未定义",
}

export function ProductListTable({
  isLoading,
  products,
  pageSize,
  onToggleAvailability,
  isToggling,
  onViewDetail,
}: ProductListTableProps) {
  return (
    <div className="border rounded-md bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">商品名称</TableHead>
            <TableHead className="w-[120px]">类型</TableHead>
            <TableHead className="w-[180px]">价格 (多币种)</TableHead>
            <TableHead className="w-[80px]">状态</TableHead>
            <TableHead className="w-[80px]">上架</TableHead>
            <TableHead className="w-[80px]">排序</TableHead>
            <TableHead className="w-[120px]">创建时间</TableHead>
            <TableHead className="w-[80px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: pageSize }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
              </TableRow>
            ))
          ) : products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                暂无商品
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow 
                key={product.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onViewDetail(product)}
              >
                <TableCell className="font-medium">
                  <div className="min-w-0">
                    <p className="truncate text-primary font-semibold">{product.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">{product.id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {typeLabels[product.type] || product.type}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <ProductPriceCell 
                    price={product.price}
                    originalPrice={product.originalPrice}
                    currency={product.currency}
                    prices={product.prices}
                  />
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={product.status === "ACTIVE" ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    {statusLabels[product.status] || product.status}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={product.isAvailable}
                    onCheckedChange={() => onToggleAvailability(product.id)}
                    disabled={isToggling}
                  />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {product.sortOrder}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(product.createdAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => onViewDetail(product)}>
                    详情
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

