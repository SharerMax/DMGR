import type { DomainFilterState } from './DomainFilter'
import type { CreateDNSRecordInput, DNSRecord } from '@/stores/dnsRecords'
import type { CreateDomainInput, Domain } from '@/stores/domains'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/hooks/useConfirm'
import { useDNSRecordStore } from '@/stores/dnsRecords'
import { useDomainStore } from '@/stores/domains'
import { useProviderStore } from '@/stores/providers'
import { DnsRecordDialog } from './DnsRecordDialog'
import { DomainFilter } from './DomainFilter'
import { DomainFormDialog } from './DomainFormDialog'
import { DomainTable } from './DomainTable'

export default function Domains() {
  const { domains, loading, fetchDomains, createDomain, updateDomain, deleteDomain } = useDomainStore()
  const { providers, providerTypes, fetchProviders, fetchProviderTypes } = useProviderStore()
  const { records, fetchRecords, createRecord, updateRecord, deleteRecord } = useDNSRecordStore()
  const { confirm } = useConfirm()

  const supportsDNS = (providerId: number | null | undefined) => {
    if (!providerId)
      return true
    const provider = providers.find(p => p.id === providerId)
    if (!provider)
      return false
    const typeConfig = providerTypes.find(t => t.id === provider.type)
    return !!typeConfig?.features.dnsManagement
  }

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size)
    setCurrentPage(1)
  }

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dnsDialogOpen, setDnsDialogOpen] = useState(false)
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null)
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null)

  const [filters, setFilters] = useState<DomainFilterState>({
    search: '',
    providerId: 'all',
  })

  // 当过滤器改变时重新获取数据
  useEffect(() => {
    fetchDomains({
      search: filters.search,
      providerId: filters.providerId === 'all' ? 'all' : Number(filters.providerId),
    })
    setCurrentPage(1)
  }, [filters, fetchDomains])

  useEffect(() => {
    fetchProviders()
    fetchProviderTypes()
  }, [fetchProviders, fetchProviderTypes])

  useEffect(() => {
    if (selectedDomainId) {
      fetchRecords(selectedDomainId)
    }
  }, [selectedDomainId, fetchRecords])

  const paginatedDomains = domains.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSubmitDomain = async (payload: CreateDomainInput, editing: Domain | null) => {
    if (editing) {
      await updateDomain(editing.id, payload)
    }
    else {
      await createDomain(payload)
    }
  }

  const handleSubmitRecord = async (payload: CreateDNSRecordInput, editingRecord: DNSRecord | null) => {
    if (editingRecord) {
      await updateRecord(editingRecord.id, payload)
    }
    else {
      await createRecord(payload)
    }
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: '删除域名',
      description: '确定要删除这个域名吗？此操作不可撤销。',
      confirmText: '删除',
      destructive: true,
    })
    if (!confirmed)
      return
    try {
      await deleteDomain(id)
    }
    catch (error: any) {
      toast.error(error.message || '删除失败')
    }
  }

  const handleDNSRecordDelete = async (id: number) => {
    const confirmed = await confirm({
      title: '删除DNS记录',
      description: '确定要删除这个DNS记录吗？此操作不可撤销。',
      confirmText: '删除',
      destructive: true,
    })
    if (!confirmed)
      return
    try {
      await deleteRecord(id)
    }
    catch (error: any) {
      toast.error(error.message || '删除失败')
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">域名列表</h2>
        <Button onClick={() => {
          setEditingDomain(null)
          setDialogOpen(true)
        }}
        >
          <Plus className="h-4 w-4 mr-2" />
          添加域名
        </Button>
      </div>

      <DomainFilter filters={filters} providers={providers} onChange={setFilters} />

      <DomainTable
        domains={paginatedDomains}
        loading={loading}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        total={domains.length}
        canManageDns={supportsDNS}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={handleItemsPerPageChange}
        onEdit={(domain) => {
          setEditingDomain(domain)
          setDialogOpen(true)
        }}
        onDelete={handleDelete}
        onManageDns={(domainId) => {
          setSelectedDomainId(domainId)
          setDnsDialogOpen(true)
        }}
      />

      <DomainFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingDomain={editingDomain}
        providers={providers}
        providerTypes={providerTypes}
        onSubmit={handleSubmitDomain}
      />

      <DnsRecordDialog
        open={dnsDialogOpen}
        onOpenChange={setDnsDialogOpen}
        domainId={selectedDomainId}
        records={records}
        onSubmitRecord={handleSubmitRecord}
        onDeleteRecord={handleDNSRecordDelete}
      />
    </>
  )
}
