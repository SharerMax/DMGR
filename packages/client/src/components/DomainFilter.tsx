import type { Domain } from '@/stores/domains'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface DomainFilterProps {
  domains: Domain[]
  search: string
  providerId: string
  onSearchChange: (value: string) => void
  onProviderChange: (value: string) => void
  showProviderFilter?: boolean
}

export function DomainFilter({
  domains,
  search,
  providerId,
  onSearchChange,
  onProviderChange,
  showProviderFilter = true,
}: DomainFilterProps) {
  // 获取唯一的服务商列表
  const providers = [...new Map(domains.map(d => [d.providerId, d.provider_name])).entries()]
    .filter(([id]) => id)
    .map(([id, name]) => ({ id: id!.toString(), name: name || '未知' }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="domain_search">搜索域名</Label>
        <Input
          id="domain_search"
          placeholder="输入域名进行搜索..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
      </div>
      {showProviderFilter && (
        <div className="space-y-2">
          <Label htmlFor="provider_filter">服务商筛选</Label>
          <Select value={providerId} onValueChange={onProviderChange}>
            <SelectTrigger>
              <SelectValue placeholder="全部服务商" />
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
        </div>
      )}
    </div>
  )
}
