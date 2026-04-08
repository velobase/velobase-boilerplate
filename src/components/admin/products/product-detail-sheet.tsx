import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatPrice } from "./product-price-cell"
import type { RouterOutputs } from "@/trpc/react"

// 使用 API 返回的 Product 类型
type Product = RouterOutputs["admin"]["listProducts"]["items"][number]

interface ProductDetailSheetProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  onUpdate: _onUpdate,
}: ProductDetailSheetProps) {
  if (!product) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[800px] sm:max-w-[800px] p-0 flex flex-col">
        <div className="p-6 border-b">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl">{product.name}</SheetTitle>
                <SheetDescription className="mt-1 font-mono text-xs">
                  ID: {product.id}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                 <Badge variant={product.status === "ACTIVE" ? "default" : "secondary"}>
                  {product.status}
                </Badge>
                {product.isAvailable ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">已上架</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">未上架</Badge>
                )}
              </div>
            </div>
          </SheetHeader>
        </div>

        <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-2">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="pricing">价格配置</TabsTrigger>
              <TabsTrigger value="subscription" disabled={product.type !== "SUBSCRIPTION"}>
                订阅配置
              </TabsTrigger>
              <TabsTrigger value="metadata">元数据 & Airwallex</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <TabsContent value="basic" className="space-y-6 m-0">
                <Section title="基础信息">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="商品名称" value={product.name} />
                    <DetailItem label="商品类型" value={product.type} />
                    <DetailItem label="排序权重" value={product.sortOrder} />
                    <DetailItem label="创建时间" value={new Date(product.createdAt).toLocaleString()} />
                  </div>
                </Section>

                <Section title="试用配置">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem 
                      label="开启试用" 
                      value={product.hasTrial ? "是" : "否"} 
                    />
                    {product.hasTrial && (
                      <>
                        <DetailItem label="试用天数" value={product.trialDays || "-"} />
                        <DetailItem label="试用赠送积分" value={product.trialCreditsAmount || "-"} />
                      </>
                    )}
                  </div>
                </Section>

                 <Section title="积分包配置" hidden={!product.creditsPackage}>
                  <div className="grid grid-cols-2 gap-4">
                     <DetailItem 
                      label="包含积分" 
                      value={product.creditsPackage?.creditsAmount} 
                    />
                  </div>
                </Section>
              </TabsContent>

              <TabsContent value="pricing" className="space-y-6 m-0">
                <Section title="默认价格 (USD)">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem 
                      label="现价" 
                      value={formatPrice(product.price, product.currency)} 
                      className="text-lg font-medium text-primary"
                    />
                    <DetailItem 
                      label="原价 (划线价)" 
                      value={product.originalPrice > 0 ? formatPrice(product.originalPrice, product.currency) : "-"} 
                      className="text-muted-foreground line-through"
                    />
                  </div>
                </Section>

                <Section title="多币种定价 (ProductPrice)">
                  {product.prices && product.prices.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">币种</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">现价</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">原价</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {product.prices.map((price) => (
                            <tr key={price.currency}>
                              <td className="px-4 py-2 font-medium">{price.currency}</td>
                              <td className="px-4 py-2">{formatPrice(price.amount, price.currency)}</td>
                              <td className="px-4 py-2 text-muted-foreground">
                                {price.originalAmount > 0 ? formatPrice(price.originalAmount, price.currency) : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground py-4 text-center border rounded-md border-dashed">
                      未配置本地化价格，将使用默认 USD 价格自动转换
                    </div>
                  )}
                </Section>
              </TabsContent>

              <TabsContent value="subscription" className="space-y-6 m-0">
                 <Section title="订阅计划">
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="Plan ID" value={product.productSubscription?.planId} />
                    <DetailItem label="周期" value={product.productSubscription?.plan.interval} />
                    <DetailItem label="周期数" value={product.productSubscription?.plan.intervalCount} />
                    <DetailItem label="周期赠送积分" value={product.productSubscription?.plan.creditsPerPeriod} />
                  </div>
                </Section>
              </TabsContent>

              <TabsContent value="metadata" className="space-y-6 m-0">
                <Section title="Airwallex 配置">
                  <pre className="bg-muted p-4 rounded-md text-xs font-mono overflow-auto max-h-[300px]">
                    {JSON.stringify((product.metadata as Record<string, unknown> | null)?.airwallex, null, 2)}
                  </pre>
                </Section>

                <Section title="完整 Metadata">
                  <pre className="bg-muted p-4 rounded-md text-xs font-mono overflow-auto max-h-[300px]">
                    {JSON.stringify(product.metadata, null, 2)}
                  </pre>
                </Section>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children, hidden }: { title: string; children: React.ReactNode, hidden?: boolean }) {
  if (hidden) return null
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
      <div className="bg-card rounded-lg border p-4 shadow-sm">
        {children}
      </div>
    </div>
  )
}

function DetailItem({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm ${className}`}>{value}</div>
    </div>
  )
}

