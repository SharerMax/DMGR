import type { Provider, ProviderField, ProviderType } from '@/stores/providers'
import { Database, Globe, Pencil, Plus, RefreshCw, Shield, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useConfirm } from '@/hooks/useConfirm'
import { useDomainStore } from '@/stores/domains'
import { useProviderStore } from '@/stores/providers'

export default function Providers() {
  const {
    providers,
    providerTypes,
    loading,
    fetchProviders,
    fetchProviderTypes,
    createProvider,
    updateProvider,
    deleteProvider,
    syncDomains,
  } = useProviderStore()
  const { fetchDomains } = useDomainStore()
  const { confirm } = useConfirm()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null)
  const [syncingProvider, setSyncingProvider] = useState<number | null>(null)
  const [selectedType, setSelectedType] = useState<string>('')
  const [configData, setConfigData] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: '',
    supportsAutoRenew: false,
  })

  useEffect(() => {
    fetchProviders()
    fetchProviderTypes()
  }, [fetchProviders, fetchProviderTypes])

  const resetForm = () => {
    setFormData({ name: '', supportsAutoRenew: false })
    setSelectedType('')
    setConfigData({})
    setEditingProvider(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (provider: Provider) => {
    setEditingProvider(provider)
    setSelectedType(provider.type)
    setFormData({
      name: provider.name,
      supportsAutoRenew: provider.supportsAutoRenew,
    })
    // 解析配置
    try {
      const parsedConfig = JSON.parse(provider.config)
      setConfigData(parsedConfig)
    }
    catch {
      setConfigData({})
    }
    setDialogOpen(true)
  }

  const handleTypeChange = (typeId: string) => {
    setSelectedType(typeId)
    setConfigData({})
    // 设置默认名称
    const type = providerTypes.find(t => t.id === typeId)
    if (type && !formData.name) {
      setFormData(prev => ({ ...prev, name: type.name }))
    }
    // 设置默认自动续期
    if (type) {
      setFormData(prev => ({ ...prev, supportsAutoRenew: type.supportsAutoRenew }))
    }
  }

  const updateConfigField = (key: string, value: string) => {
    setConfigData(prev => ({ ...prev, [key]: value }))
  }

  const getCurrentType = (): ProviderType | undefined => {
    return providerTypes.find(t => t.id === selectedType)
  }
  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    if (!selectedType) {
      alert('请选择服务商类型')
      return
    }

    const type = getCurrentType()
    if (!type)
      return

    // 验证必填字段
    const missingFields = type.fields
      .filter(f => f.required && !configData[f.key])
      .map(f => f.label)

    if (missingFields.length > 0) {
      alert(`请填写以下必填字段: ${missingFields.join(', ')}`)
      return
    }

    try {
      const data = {
        type: selectedType,
        name: formData.name,
        config: configData,
        supportsAutoRenew: formData.supportsAutoRenew,
      }

      if (editingProvider) {
        await updateProvider(editingProvider.id, data)
      }
      else {
        await createProvider(data)
      }
      setDialogOpen(false)
      resetForm()
    }
    catch (error: any) {
      alert(error.message || '操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: '删除服务商',
      description: '确定要删除这个服务商吗？此操作不可撤销。',
      confirmText: '删除',
      destructive: true,
    })
    if (!confirmed)
      return
    try {
      await deleteProvider(id)
    }
    catch (error: any) {
      alert(error.message || '删除失败')
    }
  }

  const handleSync = async (provider: Provider) => {
    setSyncingProvider(provider.id)
    try {
      const result = await syncDomains(provider.id)
      alert(`同步成功！新增 ${result.syncedCount} 个域名`)
      await fetchDomains()
    }
    catch (error: any) {
      alert(error.message || '同步失败')
    }
    finally {
      setSyncingProvider(null)
    }
  }

  const renderField = (field: ProviderField) => {
    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key}>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          id={field.key}
          type={field.type === 'password' ? 'password' : 'text'}
          value={configData[field.key] || ''}
          onChange={e => updateConfigField(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
        {field.description && (
          <p className="text-xs text-gray-500">{field.description}</p>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">服务商管理</h2>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          添加服务商
        </Button>
      </div>

      {loading
        ? (
            <div className="text-center py-12">加载中...</div>
          )
        : providers.length === 0
          ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  暂无服务商，点击上方按钮添加
                </CardContent>
              </Card>
            )
          : (
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
                              <p className="text-sm text-gray-500">{typeConfig.name}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {typeConfig?.features.includes('域名同步') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSync(provider)}
                                disabled={syncingProvider === provider.id}
                                title="同步域名"
                              >
                                <RefreshCw className={`h-4 w-4 ${syncingProvider === provider.id ? 'animate-spin' : ''}`} />
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(provider)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(provider.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          {typeConfig && (
                            <div className="flex flex-wrap gap-1">
                              {typeConfig.features.map(feature => (
                                <span
                                  key={feature}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                >
                                  {feature === 'DNS管理' && <Database className="h-3 w-3 mr-1" />}
                                  {feature === '域名同步' && <Globe className="h-3 w-3 mr-1" />}
                                  {feature === '自动续期' && <Shield className="h-3 w-3 mr-1" />}
                                  {feature}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="flex items-center gap-2">
                            <span className={provider.supportsAutoRenew ? 'text-green-600' : 'text-gray-400'}>
                              {provider.supportsAutoRenew ? '✓ 支持自动续期' : '✗ 不支持自动续期'}
                            </span>
                          </p>
                          {typeConfig?.supportsAutoRenew && typeConfig.maxRenewalDays && (
                            <p className="text-sm text-gray-600">
                              可续期时间: 过期前
                              {' '}
                              <span className="font-medium">{typeConfig.maxRenewalDays}</span>
                              {' '}
                              天内
                            </p>
                          )}
                          <p className="text-gray-400 text-xs">
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
            )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProvider ? '编辑服务商' : '添加服务商'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 服务商类型选择 */}
            {!editingProvider && (
              <div className="space-y-2">
                <Label htmlFor="type">
                  服务商类型
                  {' '}
                  <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedType} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择服务商类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex flex-col">
                          <span>{type.name}</span>
                          {type.description && (
                            <span className="text-xs text-gray-500">{type.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 编辑模式下显示服务商类型 */}
            {editingProvider && (
              <div className="space-y-2">
                <Label>服务商类型</Label>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {providerTypes.find(t => t.id === selectedType)?.name}
                </div>
              </div>
            )}

            {/* 服务商名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="服务商显示名称"
                required
              />
            </div>

            {/* 动态配置字段 */}
            {selectedType && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  API 配置
                </h3>
                {getCurrentType()?.fields.map(field => renderField(field))}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit">{editingProvider ? '更新' : '创建'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
