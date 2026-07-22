import type { Provider } from '@/stores/providers'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface DomainFilterState {
  search: string
  providerId: string
}

interface DomainFilterProps {
  filters: DomainFilterState
  providers: Provider[]
  onChange: (filters: DomainFilterState) => void
}

export function DomainFilter({ filters, providers, onChange }: DomainFilterProps) {
  return (
    <Card className="mb-6">
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="搜索域名..."
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            className="w-52"
          />
          <Select
            value={filters.providerId}
            onValueChange={value => onChange({ ...filters, providerId: value ?? 'all' })}
          >
            <SelectTrigger className="w-40">
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
              {providers.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filters.search || filters.providerId !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onChange({ search: '', providerId: 'all' })}
            >
              清除筛选
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
