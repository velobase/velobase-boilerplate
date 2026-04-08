import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X } from "lucide-react"

export type FilterType = "all" | "SUBSCRIPTION" | "CREDITS_PACKAGE" | "ONE_TIME_ENTITLEMENT"
export type FilterStatus = "all" | "ACTIVE" | "INACTIVE"
export type FilterYesNo = "all" | "yes" | "no"

export interface ProductFilters {
  type: FilterType
  status: FilterStatus
  isAvailable: FilterYesNo
}

export const defaultFilters: ProductFilters = {
  type: "all",
  status: "all",
  isAvailable: "all",
}

interface ProductListFilterProps {
  filters: ProductFilters
  onChange: <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) => void
  onClear: () => void
  hasActiveFilters: boolean
}

export function ProductListFilter({
  filters,
  onChange,
  onClear,
  hasActiveFilters,
}: ProductListFilterProps) {
  return (
    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">筛选</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" />
            清除全部
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">类型</label>
          <Select
            value={filters.type}
            onValueChange={(v) => onChange("type", v as FilterType)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="SUBSCRIPTION">订阅</SelectItem>
              <SelectItem value="CREDITS_PACKAGE">积分包</SelectItem>
              <SelectItem value="ONE_TIME_ENTITLEMENT">一次性权益</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">状态</label>
          <Select
            value={filters.status}
            onValueChange={(v) => onChange("status", v as FilterStatus)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="ACTIVE">启用</SelectItem>
              <SelectItem value="INACTIVE">停用</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">上架</label>
          <Select
            value={filters.isAvailable}
            onValueChange={(v) => onChange("isAvailable", v as FilterYesNo)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="yes">是</SelectItem>
              <SelectItem value="no">否</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

