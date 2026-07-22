import type { DateRange } from 'react-day-picker'
import type { RenewalLogFilters } from '@/stores/renewalLogs'
import { DateRangePicker } from '@/components/DatePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ProviderOption {
  id: string
  name: string
}

interface RenewalLogFilterProps {
  filters: RenewalLogFilters
  providers: ProviderOption[]
  dateRange: DateRange | undefined
  onFilterChange: (key: keyof RenewalLogFilters, value: string | number | undefined) => void
  onDateRangeChange: (range: DateRange | undefined) => void
  onClearFilters: () => void
}

export function RenewalLogFilter({
  filters,
  providers,
  dateRange,
  onFilterChange,
  onDateRangeChange,
  onClearFilters,
}: RenewalLogFilterProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="搜索域名..."
            value={filters.domainName || ''}
            onChange={e => onFilterChange('domainName', e.target.value || undefined)}
            className="w-52"
          />
          <Select
            value={filters.providerId?.toString() || 'all'}
            onValueChange={value => onFilterChange('providerId', value === 'all' ? undefined : Number(value))}
          >
            <SelectTrigger className="w-30">
              <SelectValue placeholder="全部服务商">
                {(value: string | null) => {
                  if (!value || value === 'all')
                    return '全部服务商'
                  return providers.find(p => p.id === value)?.name || '未知'
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部服务商</SelectItem>
              {providers.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
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
                  const labels: Record<string, string> = {
                    completed: '成功',
                    failed: '失败',
                    pending: '处理中',
                    skipped: '已跳过',
                  }
                  return labels[value] || value
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="completed">成功</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
              <SelectItem value="pending">处理中</SelectItem>
              <SelectItem value="skipped">已跳过</SelectItem>
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
