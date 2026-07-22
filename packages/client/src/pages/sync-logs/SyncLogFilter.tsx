import type { DateRange } from 'react-day-picker'
import type { Provider } from '@/stores/providers'
import type { SyncLogFilters } from '@/stores/syncLogs'
import { DateRangePicker } from '@/components/DatePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface SyncLogFilterProps {
  filters: SyncLogFilters
  providers: Provider[]
  dateRange: DateRange | undefined
  onFilterChange: (key: keyof SyncLogFilters, value: string | number | undefined) => void
  onDateRangeChange: (range: DateRange | undefined) => void
  onClearFilters: () => void
}

const STATUS_LABELS: Record<string, string> = {
  success: '成功',
  failed: '失败',
  partial: '部分成功',
}

export function SyncLogFilter({
  filters,
  providers,
  dateRange,
  onFilterChange,
  onDateRangeChange,
  onClearFilters,
}: SyncLogFilterProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filters.providerId?.toString() || 'all'}
            onValueChange={value => onFilterChange('providerId', value === 'all' ? undefined : Number(value))}
          >
            <SelectTrigger className="w-30">
              <SelectValue placeholder="全部服务商">
                {(value: string | null) => {
                  if (!value || value === 'all')
                    return '全部服务商'
                  return providers.find(p => p.id.toString() === value)?.name || '未知'
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部服务商</SelectItem>
              {providers.map(provider => (
                <SelectItem key={provider.id} value={provider.id.toString()}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status || 'all'}
            onValueChange={value => onFilterChange('status', value === 'all' ? undefined : value ?? undefined)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="选择状态">
                {(value: string | null) => {
                  if (!value || value === 'all')
                    return '全部状态'
                  return STATUS_LABELS[value] || value
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="success">成功</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
              <SelectItem value="partial">部分成功</SelectItem>
            </SelectContent>
          </Select>
          <DateRangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            className="w-64"
          />
          <Button variant="outline" onClick={onClearFilters}>
            清除筛选
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
