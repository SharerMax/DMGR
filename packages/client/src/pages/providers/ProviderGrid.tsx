import type { Provider, ProviderType } from '@/stores/providers'
import { Database, Globe, Pencil, RefreshCw, Shield, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ProviderGridProps {
  providers: Provider[]
  providerTypes: ProviderType[]
  loading: boolean
  syncingProvider: number | null
  onSync: (provider: Provider) => void
  onEdit: (provider: Provider) => void
  onDelete: (provider: Provider) => void
}

export function ProviderGrid({
  providers,
  providerTypes,
  loading,
  syncingProvider,
  onSync,
  onEdit,
  onDelete,
}: ProviderGridProps) {
  if (loading) {
    return <div className="text-center py-12">加载中...</div>
  }

  if (providers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          暂无服务商，点击上方按钮添加
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {providers.map((provider) => {
        const typeConfig = providerTypes.find(t => t.id === provider.type)
        return (
          <Card key={provider.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{provider.name}</CardTitle>
                  {typeConfig && (
                    <p className="text-sm text-muted-foreground">{typeConfig.name}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {typeConfig?.features.domainSync && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSync(provider)}
                      disabled={syncingProvider === provider.id}
                      title="同步域名"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncingProvider === provider.id ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => onEdit(provider)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(provider)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {typeConfig && (
                  <div className="flex flex-wrap gap-1">
                    {typeConfig.features.domainSync && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-status-info-bg text-status-info">
                        <Globe className="h-3 w-3 mr-1" />
                        域名同步
                      </span>
                    )}
                    {typeConfig.features.dnsManagement && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-status-info-bg text-status-info">
                        <Database className="h-3 w-3 mr-1" />
                        DNS管理
                      </span>
                    )}
                    {typeConfig.features.autoRenew && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-status-info-bg text-status-info">
                        <Shield className="h-3 w-3 mr-1" />
                        自动续期
                      </span>
                    )}
                  </div>
                )}
                <p className="flex items-center gap-2">
                  <span className={typeConfig?.features.autoRenew ? 'text-status-success' : 'text-status-disabled'}>
                    {typeConfig?.features.autoRenew ? '✓ 支持自动续期' : '✗ 不支持自动续期'}
                  </span>
                </p>
                {typeConfig?.features.autoRenew && typeConfig.maxRenewalDays && (
                  <p className="text-sm text-secondary-foreground">
                    可续期时间: 过期前
                    {' '}
                    <span className="font-medium">{typeConfig.maxRenewalDays}</span>
                    {' '}
                    天内
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  添加于
                  {' '}
                  {new Date(provider.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
