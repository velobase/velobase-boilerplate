"use client"

import { api } from "@/trpc/react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useDebounce } from "@/hooks/use-debounce"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

const statusLabels: Record<string, string> = {
  ACTIVE: "启用",
  DISABLED: "停用",
  EXPIRED: "过期",
  UNDEFINED: "未定义",
}

const grantTypeLabels: Record<string, string> = {
  CREDIT: "积分",
  PRODUCT: "产品",
  UNDEFINED: "未定义",
}

export function PromoCodesTable() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<"all" | "ACTIVE" | "DISABLED" | "EXPIRED">("all")
  const [grantTypeFilter, setGrantTypeFilter] = useState<"all" | "CREDIT" | "PRODUCT">("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const debouncedSearch = useDebounce(search, 500)
  const utils = api.useUtils()

  const { data, isLoading } = api.admin.listPromoCodes.useQuery({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    status: statusFilter,
    grantType: grantTypeFilter,
  })

  const createMutation = api.admin.createPromoCode.useMutation({
    onSuccess: () => {
      toast.success("促销码创建成功")
      setShowCreateDialog(false)
      void utils.admin.listPromoCodes.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = api.admin.deletePromoCode.useMutation({
    onSuccess: () => {
      toast.success("促销码已删除")
      void utils.admin.listPromoCodes.invalidate()
    },
  })

  const updateMutation = api.admin.updatePromoCode.useMutation({
    onSuccess: () => {
      toast.success("状态已更新")
      void utils.admin.listPromoCodes.invalidate()
    },
  })

  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">促销码管理</h1>
          <p className="text-muted-foreground">
            {total > 0 ? `${total.toLocaleString()} 个促销码` : "管理促销码"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索促销码..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setPage(1) }}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="ACTIVE">启用</SelectItem>
              <SelectItem value="DISABLED">停用</SelectItem>
              <SelectItem value="EXPIRED">过期</SelectItem>
            </SelectContent>
          </Select>
          <Select value={grantTypeFilter} onValueChange={(v) => { setGrantTypeFilter(v as typeof grantTypeFilter); setPage(1) }}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="CREDIT">积分</SelectItem>
              <SelectItem value="PRODUCT">产品</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新建
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">促销码</TableHead>
              <TableHead className="w-[80px]">类型</TableHead>
              <TableHead className="w-[100px]">赠送</TableHead>
              <TableHead className="w-[80px]">状态</TableHead>
              <TableHead className="w-[100px]">使用/限制</TableHead>
              <TableHead className="w-[120px]">过期时间</TableHead>
              <TableHead className="w-[200px]">备注</TableHead>
              <TableHead className="w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  暂无促销码
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell className="font-mono font-medium">{promo.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {grantTypeLabels[promo.grantType] || promo.grantType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {promo.grantType === "CREDIT" ? `${promo.creditsAmount} 积分` : promo.productId ? "产品" : "-"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={promo.status}
                      onValueChange={(v) => updateMutation.mutate({ id: promo.id, status: v as "ACTIVE" | "DISABLED" | "EXPIRED" })}
                    >
                      <SelectTrigger className="h-7 w-[80px]">
                        <Badge variant={promo.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                          {statusLabels[promo.status] || promo.status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">启用</SelectItem>
                        <SelectItem value="DISABLED">停用</SelectItem>
                        <SelectItem value="EXPIRED">过期</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {promo.usedCount} / {promo.usageLimit === 0 ? "∞" : promo.usageLimit}
                    <span className="text-xs ml-1">({promo._count.redemptions}人)</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {promo.expiresAt
                      ? new Date(promo.expiresAt).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
                      : "永久"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {promo.notes || "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm("确定删除此促销码？")) {
                          deleteMutation.mutate({ id: promo.id })
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>每页:</span>
          <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-sm text-muted-foreground">
            {total > 0 ? `${startItem}-${endItem} / ${total.toLocaleString()}` : "0 条结果"}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1 || isLoading}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page - 1)} disabled={page === 1 || isLoading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm w-20 text-center">第 {page} / {totalPages} 页</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(page + 1)} disabled={page >= totalPages || isLoading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page >= totalPages || isLoading}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <CreatePromoCodeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />
    </div>
  )
}

function CreatePromoCodeDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    code: string
    grantType: "CREDIT" | "PRODUCT"
    creditsAmount?: number
    usageLimit?: number
    perUserLimit?: number
    expiresAt?: string
    notes?: string
  }) => void
  isPending: boolean
}) {
  const [code, setCode] = useState("")
  const [grantType, setGrantType] = useState<"CREDIT" | "PRODUCT">("CREDIT")
  const [creditsAmount, setCreditsAmount] = useState(100)
  const [usageLimit, setUsageLimit] = useState(0)
  const [perUserLimit, setPerUserLimit] = useState(1)
  const [expiresAt, setExpiresAt] = useState("")
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      code,
      grantType,
      creditsAmount: grantType === "CREDIT" ? creditsAmount : 0,
      usageLimit,
      perUserLimit,
      expiresAt: expiresAt || undefined,
      notes: notes || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新建促销码</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">促销码</Label>
              <Input
                id="code"
                placeholder="PROMO2024"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>赠送类型</Label>
              <Select value={grantType} onValueChange={(v) => setGrantType(v as "CREDIT" | "PRODUCT")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CREDIT">积分</SelectItem>
                  <SelectItem value="PRODUCT">产品</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {grantType === "CREDIT" && (
              <div className="grid gap-2">
                <Label htmlFor="credits">积分数量</Label>
                <Input
                  id="credits"
                  type="number"
                  min={1}
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(Number(e.target.value))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="usageLimit">总使用次数 (0=无限)</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  min={0}
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="perUserLimit">每用户次数</Label>
                <Input
                  id="perUserLimit"
                  type="number"
                  min={0}
                  value={perUserLimit}
                  onChange={(e) => setPerUserLimit(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiresAt">过期时间 (可选)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">备注</Label>
              <Input
                id="notes"
                placeholder="可选备注"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !code.trim()}>
              {isPending ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

