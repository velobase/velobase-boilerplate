"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"
import type { Filters, FilterStatus, FilterType } from "./types"

interface OrderFiltersProps {
  filters: Filters
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function OrderFilters({ filters, onFilterChange, onClearFilters, hasActiveFilters }: OrderFiltersProps) {
  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">筛选</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" />
            清除全部
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">状态</label>
          <Select value={filters.status} onValueChange={(v) => onFilterChange("status", v as FilterStatus)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="PENDING">待支付</SelectItem>
              <SelectItem value="COMPLETED">已完成</SelectItem>
              <SelectItem value="CANCELLED">已取消</SelectItem>
              <SelectItem value="EXPIRED">已过期</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">订单类型</label>
          <Select value={filters.type} onValueChange={(v) => onFilterChange("type", v as FilterType)}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="NEW_PURCHASE">新购</SelectItem>
              <SelectItem value="RENEWAL">续费</SelectItem>
              <SelectItem value="UPGRADE">升级</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">开始日期</label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange("dateFrom", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">结束日期</label>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange("dateTo", e.target.value)}
            className="h-9"
          />
        </div>
      </div>
    </div>
  )
}

