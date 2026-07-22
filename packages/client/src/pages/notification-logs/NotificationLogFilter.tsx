import type { DateRange } from 'react-day-picker'
import type { Domain } from '@/stores/domains'
import type { NotificationLogFilters } from '@/stores/notificationLogs'
import type { Provider } from '@/stores/providers'
import { Loader2 } from 'lucide-react'
import { DateRangePicker } from '@/components/DatePicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from '@/components/ui/combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'

const CHANNEL_LABELS: Record<string, string> = {
  email: '邮件',
  telegram: 'Telegram',
  feishu: '飞书',
  webhook: 'Webhook',
}

interface NotificationLogFilterProps {
  filters: NotificationLogFilters
  providers: Provider[]
  selectedDomain: Domain | undefined
  searchQuery: string
  searchLoading: boolean
  groupedDomains: Record<string | number, Domain[]>
  dateRange: DateRange | undefined
  onFilterChange: (key: keyof NotificationLogFilters, value: string | number | undefined) => void
  onDateRangeChange: (range: DateRange | undefined) => void
  onSearchQueryChange: (query: string) => void
  onClearFilters: () => void
}

export function NotificationLogFilter({
  filters,
  providers,
  selectedDomain,
  searchQuery,
  searchLoading,
  groupedDomains,
  dateRange,
  onFilterChange,
  onDateRangeChange,
  onSearchQueryChange,
  onClearFilters,
}: NotificationLogFilterProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filters.type || 'all'}
            onValueChange={value => onFilterChange('type', value === 'all' ? undefined : value ?? undefined)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="选择类型">
                {(value: string | null) => {
                  if (!value || value === 'all')
                    return '全部类型'
                  return NOTIFICATION_TYPE_LABELS[value] || value
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="expiry_reminder">过期提醒</SelectItem>
              <SelectItem value="renewal_success">续期成功</SelectItem>
              <SelectItem value="renewal_failed">续期失败</SelectItem>
              <SelectItem value="sync_completed">同步完成</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.channel || 'all'}
            onValueChange={value => onFilterChange('channel', value === 'all' ? undefined : value ?? undefined)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="选择渠道">
                {(value: string | null) => {
                  if (!value || value === 'all')
                    return '全部渠道'
                  return CHANNEL_LABELS[value] || value
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部渠道</SelectItem>
              <SelectItem value="email">邮件</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="feishu">飞书</SelectItem>
              <SelectItem value="webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>
          <Combobox
            value={filters.domainId?.toString() || ''}
            onValueChange={(value) => {
              onFilterChange('domainId', value ? Number(value) : undefined)
              if (!value)
                onSearchQueryChange('')
            }}
          >
            <ComboboxInput
              placeholder="搜索域名..."
              className="w-52"
              showClear
              value={filters.domainId ? selectedDomain?.name || '' : searchQuery}
              onInput={e => onSearchQueryChange((e.target as HTMLInputElement).value)}
            />
            <ComboboxContent>
              <ComboboxList>
                <ComboboxItem value="" className="font-medium">全部域名</ComboboxItem>
                {searchLoading
                  ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    )
                  : Object.keys(groupedDomains).length > 0
                    ? (
                        Object.entries(groupedDomains).map(([providerId, domainList]) => {
                          const provider = providers.find(p => p.id === Number(providerId))
                          const label = provider ? provider.name : providerId === 'none' ? '未分配服务商' : '未知服务商'
                          return (
                            <ComboboxGroup key={providerId}>
                              <ComboboxLabel>{label}</ComboboxLabel>
                              {domainList.map(domain => (
                                <ComboboxItem key={domain.id} value={domain.id.toString()}>
                                  {domain.name}
                                </ComboboxItem>
                              ))}
                            </ComboboxGroup>
                          )
                        })
                      )
                    : (
                        <ComboboxEmpty>未找到匹配的域名</ComboboxEmpty>
                      )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
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
