import type { Provider, ProviderField } from '@/stores/providers'
import { Database, Globe, Pencil, Plus, RefreshCw, Shield, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
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

interface ProviderFormValues {
  type: string
  name: string
  config: Record<string, string>
}

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

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProviderFormValues>({
    defaultValues: {
      type: '',
      name: '',
      config: {},
    },
  })

  const selectedType = watch('type')
  const currentType = providerTypes.find(t => t.id === selectedType)

  useEffect(() => {
    fetchProviders()
    fetchProviderTypes()
  }, [fetchProviders, fetchProviderTypes])

  const openCreateDialog = () => {
    setEditingProvider(null)
    reset({ type: '', name: '', config: {} })
    setDialogOpen(true)
  }

  const openEditDialog = (provider: Provider) => {
    setEditingProvider(provider)
    let parsedConfig: Record<string, string> = {}
    try {
      parsedConfig = JSON.parse(provider.config)
    }
    catch {
      parsedConfig = {}
    }
    reset({
      type: provider.type,
      name: provider.name,
      config: parsedConfig,
    })
    setDialogOpen(true)
  }

  const handleTypeChange = (typeId: string) => {
    setValue('type', typeId)
    setValue('config', {})
    const type = providerTypes.find(t => t.id === typeId)
    if (type) {
      const currentName = watch('name')
      if (!currentName) {
        setValue('name', type.name)
      }
    }
  }

  const onSubmit = async (data: ProviderFormValues) => {
    try {
      const type = editingProvider ? editingProvider.type : data.type

      const payload = {
        type,
        name: data.name,
        config: data.config,
      }

      if (editingProvider) {
        await updateProvider(editingProvider.id, payload)
      }
      else {
        await createProvider(payload)
      }
      setDialogOpen(false)
    }
    catch (error: any) {
      toast.error(error.message || '操作失败')
    }
  }

  const handleDelete = async (provider: Provider) => {
    const confirmed = await confirm({
      title: '删除服务商',
      description: `确定要删除「${provider.name}」吗？该服务商下的所有域名及其 DNS 记录也将被一并删除。此操作不可撤销。`,
      confirmText: '删除',
      destructive: true,
    })
    if (!confirmed)
      return
    try {
      const result = await deleteProvider(provider.id)
      await fetchDomains()
      const parts = ['服务商已删除']
      if (result.deletedDomainCount > 0) {
        parts.push(`同时删除了 ${result.deletedDomainCount} 个关联域名`)
      }
      toast.success(parts.join('，'))
    }
    catch (error: any) {
      toast.error(error.message || '删除失败')
    }
  }

  const handleSync = async (provider: Provider) => {
    setSyncingProvider(provider.id)
    try {
      const result = await syncDomains(provider.id)
      await fetchDomains()
      const typeConfig = providerTypes.find(t => t.id === provider.type)
      const supportsDNS = typeConfig?.features.dnsManagement
      const parts = [`新增 ${result.syncedCount} 个域名`]
      if (supportsDNS) {
        if (result.dnsRecordsInserted || result.dnsRecordsDeleted) {
          const changeParts = []
          if (result.dnsRecordsInserted)
            changeParts.push(`新增 ${result.dnsRecordsInserted} 条 DNS 记录`)
          if (result.dnsRecordsDeleted)
            changeParts.push(`移除 ${result.dnsRecordsDeleted} 条 DNS 记录`)
          if (changeParts.length)
            parts.push(changeParts.join('，'))
        }
        else {
          parts.push('DNS 记录无变化')
        }
      }
      toast.success(`同步成功！${parts.join('；')}`)
    }
    catch (error: any) {
      toast.error(error.message || '同步失败')
    }
    finally {
      setSyncingProvider(null)
    }
  }

  const renderField = (field: ProviderField) => {
    const fieldError = errors.config?.[field.key]
    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key}>
          {field.label}
          {field.required && <span className="text-status-danger ml-1">*</span>}
        </Label>
        <Input
          id={field.key}
          type={field.type === 'password' ? 'password' : 'text'}
          {...register(`config.${field.key}`, {
            required: field.required ? `${field.label}为必填项` : false,
          })}
          placeholder={field.placeholder}
          aria-invalid={!!fieldError}
        />
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
        {fieldError && (
          <p className="text-xs text-status-error">{fieldError.message as string}</p>
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
                <CardContent className="py-12 text-center text-muted-foreground">
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
                              <p className="text-sm text-muted-foreground">{typeConfig.name}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {typeConfig?.features.domainSync && (
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
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(provider)}>
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
            )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProvider ? '编辑服务商' : '添加服务商'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 服务商类型选择 */}
            {!editingProvider && (
              <div className="space-y-2">
                <Label htmlFor="type">
                  服务商类型
                  <span className="text-status-danger ml-1">*</span>
                </Label>
                <Controller
                  control={control}
                  name="type"
                  rules={{ required: '请选择服务商类型' }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={handleTypeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择服务商类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {providerTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {currentType?.description && (
                  <p className="text-xs text-muted-foreground">{currentType.description}</p>
                )}
                {errors.type && (
                  <p className="text-xs text-status-error">{errors.type.message}</p>
                )}
              </div>
            )}

            {/* 编辑模式下显示服务商类型 */}
            {editingProvider && (
              <div className="space-y-2">
                <Label>服务商类型</Label>
                <div className="text-sm">
                  {currentType?.name}
                </div>
              </div>
            )}

            {/* 服务商名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                名称
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Input
                id="name"
                {...register('name', { required: '请输入服务商名称' })}
                placeholder="服务商显示名称"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-status-error">{errors.name.message}</p>
              )}
            </div>

            {/* 动态配置字段 */}
            {currentType && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-medium text-secondary-foreground">
                  API 配置
                </h3>
                {currentType.fields.map(field => renderField(field))}
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
