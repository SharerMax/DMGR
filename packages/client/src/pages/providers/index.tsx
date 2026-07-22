import type { CreateProviderInput, Provider } from '@/stores/providers'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/hooks/useConfirm'
import { useDomainStore } from '@/stores/domains'
import { useProviderStore } from '@/stores/providers'
import { ProviderFormDialog } from './ProviderFormDialog'
import { ProviderGrid } from './ProviderGrid'

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

  useEffect(() => {
    fetchProviders()
    fetchProviderTypes()
  }, [fetchProviders, fetchProviderTypes])

  const handleSubmit = async (payload: CreateProviderInput, editing: Provider | null) => {
    if (editing) {
      await updateProvider(editing.id, payload)
    }
    else {
      await createProvider(payload)
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

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">服务商管理</h2>
        <Button onClick={() => {
          setEditingProvider(null)
          setDialogOpen(true)
        }}
        >
          <Plus className="h-4 w-4 mr-2" />
          添加服务商
        </Button>
      </div>

      <ProviderGrid
        providers={providers}
        providerTypes={providerTypes}
        loading={loading}
        syncingProvider={syncingProvider}
        onSync={handleSync}
        onEdit={(provider) => {
          setEditingProvider(provider)
          setDialogOpen(true)
        }}
        onDelete={handleDelete}
      />

      <ProviderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingProvider={editingProvider}
        providerTypes={providerTypes}
        onSubmit={handleSubmit}
      />
    </>
  )
}
