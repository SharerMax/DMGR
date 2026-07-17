import type { CreateDNSRecordInput, DNSRecord } from '@/stores/dnsRecords'
import type { Domain } from '@/stores/domains'
import { differenceInDays, format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { AlertTriangle, Pencil, Plus, Settings, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { DataTablePagination } from '@/components/DataTablePagination'
import { DomainFilter } from '@/components/DomainFilter'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useConfirm } from '@/hooks/useConfirm'
import { useDNSRecordStore } from '@/stores/dnsRecords'
import { useDomainStore } from '@/stores/domains'
import { useProviderStore } from '@/stores/providers'

const DNS_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR', 'SOA']

interface DomainFormValues {
  name: string
  providerId: string
  expiryDate: string
  autoRenew: boolean
  autoRenewDays: string
  renewalPrice: string
  notes: string
}

interface DNSFormValues {
  type: string
  name: string
  value: string
  ttl: string
  priority: string
}

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

  const supportsAutoRenew = (providerId: number | null | undefined) => {
    if (!providerId)
      return false
    const provider = providers.find(p => p.id === providerId)
    if (!provider)
      return false
    const typeConfig = providerTypes.find(t => t.id === provider.type)
    return (provider.supportsAutoRenew || typeConfig?.features.autoRenew) === true
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
  const [editingDNSRecord, setEditingDNSRecord] = useState<DNSRecord | null>(null)
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null)

  const [filters, setFilters] = useState({
    search: '',
    providerId: 'all',
  })

  const {
    register: registerDomain,
    handleSubmit: handleDomainSubmit,
    control: domainControl,
    reset: resetDomainForm,
    watch: watchDomain,
    formState: { errors: domainErrors },
  } = useForm<DomainFormValues>({
    defaultValues: {
      name: '',
      providerId: '',
      expiryDate: '',
      autoRenew: false,
      autoRenewDays: '',
      renewalPrice: '',
      notes: '',
    },
  })

  const {
    register: registerDNS,
    handleSubmit: handleDNSSubmit,
    control: dnsControl,
    reset: resetDNSForm,
    watch: watchDNS,
    formState: { errors: dnsErrors },
  } = useForm<DNSFormValues>({
    defaultValues: {
      type: 'A',
      name: '',
      value: '',
      ttl: '3600',
      priority: '',
    },
  })

  const watchedProviderId = watchDomain('providerId')
  const watchedAutoRenew = watchDomain('autoRenew')
  const watchedDNSType = watchDNS('type')

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

  const getCurrentProviderType = () => {
    const selectedProvider = watchedProviderId
      ? providers.find(p => p.id === Number(watchedProviderId))
      : null
    return selectedProvider
      ? providerTypes.find(t => t.id === selectedProvider.type)
      : null
  }

  // 渲染自动续期阈值配置字段
  const renderAutoRenewDaysField = () => {
    const providerType = getCurrentProviderType()

    if (providerType?.features.autoRenew && providerType.maxRenewalDays) {
      return (
        <div className="space-y-2">
          <Label htmlFor="auto_renew_days">
            自动续期阈值（天）
            <span className="text-status-danger ml-1">*</span>
            <span className="text-xs text-muted-foreground ml-2">
              最大:
              {' '}
              {providerType.maxRenewalDays}
              {' '}
              天
            </span>
          </Label>
          <Input
            id="auto_renew_days"
            type="number"
            min={1}
            max={providerType.maxRenewalDays}
            {...registerDomain('autoRenewDays', {
              required: watchedAutoRenew ? '请输入自动续期阈值' : false,
              validate: (value) => {
                if (!watchedAutoRenew || !value)
                  return true
                const renewDays = Number(value)
                if (providerType?.maxRenewalDays && renewDays > providerType.maxRenewalDays) {
                  return `自动续期阈值不能超过 ${providerType.maxRenewalDays} 天`
                }
                return true
              },
            })}
            placeholder={`过期前多少天自动续期（最大 ${providerType.maxRenewalDays} 天）`}
            aria-invalid={!!domainErrors.autoRenewDays}
          />
          <p className="text-xs text-muted-foreground">
            域名过期前指定天数时触发自动续期
          </p>
          {domainErrors.autoRenewDays && (
            <p className="text-xs text-status-danger">{domainErrors.autoRenewDays.message}</p>
          )}
        </div>
      )
    }

    if (watchedProviderId && !providerType?.features.autoRenew) {
      return (
        <p className="text-sm text-yellow-600">
          当前服务商不支持自动续期
        </p>
      )
    }

    return null
  }

  const openCreateDialog = () => {
    setEditingDomain(null)
    resetDomainForm({
      name: '',
      providerId: '',
      expiryDate: '',
      autoRenew: false,
      autoRenewDays: '',
      renewalPrice: '',
      notes: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (domain: Domain) => {
    setEditingDomain(domain)
    resetDomainForm({
      name: domain.name,
      providerId: domain.providerId?.toString() || '',
      expiryDate: domain.expiryDate?.split('T')[0] || '',
      autoRenew: !!domain.autoRenew,
      autoRenewDays: domain.autoRenewDays?.toString() || '',
      renewalPrice: domain.renewalPrice?.toString() || '',
      notes: domain.notes || '',
    })
    setDialogOpen(true)
  }

  const openDNSDialog = (domainId: number, record?: DNSRecord) => {
    setSelectedDomainId(domainId)
    if (record) {
      setEditingDNSRecord(record)
      resetDNSForm({
        type: record.type,
        name: record.name,
        value: record.value,
        ttl: record.ttl.toString(),
        priority: record.priority?.toString() || '',
      })
    }
    else {
      setEditingDNSRecord(null)
      resetDNSForm({
        type: 'A',
        name: '',
        value: '',
        ttl: '3600',
        priority: '',
      })
    }
    setDnsDialogOpen(true)
  }

  const onDomainSubmit = async (data: DomainFormValues) => {
    try {
      const payload = {
        name: data.name,
        providerId: data.providerId ? Number(data.providerId) : null,
        expiryDate: data.expiryDate || null,
        autoRenew: data.autoRenew,
        autoRenewDays: data.autoRenew && data.autoRenewDays
          ? Number(data.autoRenewDays)
          : null,
        renewalPrice: data.renewalPrice ? Number(data.renewalPrice) : null,
        notes: data.notes || null,
      }

      if (editingDomain) {
        await updateDomain(editingDomain.id, payload)
      }
      else {
        await createDomain(payload)
      }
      setDialogOpen(false)
    }
    catch (error: any) {
      toast.error(error.message || '操作失败')
    }
  }

  const onDNSSubmit = async (data: DNSFormValues) => {
    try {
      const payload = {
        type: data.type as CreateDNSRecordInput['type'],
        name: data.name,
        value: data.value,
        ttl: Number(data.ttl) || 3600,
        priority: data.priority ? Number(data.priority) : undefined,
      }

      if (editingDNSRecord) {
        await updateRecord(editingDNSRecord.id, payload)
      }
      else {
        await createRecord({
          ...payload,
          domainId: selectedDomainId!,
        })
      }
      resetDNSForm()
    }
    catch (error: any) {
      toast.error(error.message || '操作失败')
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

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate)
      return { text: '未知', color: 'text-status-disabled', bg: 'bg-status-disabled-bg' }

    const days = differenceInDays(parseISO(expiryDate), new Date())
    if (days < 0)
      return { text: '已过期', color: 'text-status-error', bg: 'bg-status-error-bg' }
    if (days <= 7)
      return { text: `${days}天后过期`, color: 'text-status-error', bg: 'bg-status-error-bg' }
    if (days <= 30)
      return { text: `${days}天后过期`, color: 'text-status-warning', bg: 'bg-status-warning-bg' }
    if (days <= 90)
      return { text: `${days}天后过期`, color: 'text-status-warning', bg: 'bg-status-warning-bg' }
    return { text: `${days}天后过期`, color: 'text-status-success', bg: 'bg-status-success-bg' }
  }

  const currentDomainDNSRecords = records.filter(r => r.domainId === selectedDomainId)

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">域名列表</h2>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          添加域名
        </Button>
      </div>

      {/* 过滤器 */}
      <Card className="mb-6">
        <CardContent>
          <DomainFilter
            domains={domains}
            search={filters.search}
            providerId={filters.providerId}
            onSearchChange={value => setFilters({ ...filters, search: value })}
            onProviderChange={value => setFilters({ ...filters, providerId: value })}
            showProviderFilter={true}
          />
          {(filters.search || filters.providerId !== 'all') && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                共找到
                {' '}
                {domains.length}
                {' '}
                个域名
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ search: '', providerId: 'all' })}
              >
                清除筛选
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading
            ? (
                <div className="text-center py-12">加载中...</div>
              )
            : domains.length === 0
              ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {domains.length === 0 ? '暂无域名，点击上方按钮添加' : '没有找到匹配的域名'}
                  </div>
                )
              : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>域名</TableHead>
                          <TableHead>服务商</TableHead>
                          <TableHead>过期日期</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>续期价格</TableHead>
                          <TableHead>提醒</TableHead>
                          <TableHead className="w-35">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDomains.map((domain) => {
                          const status = getExpiryStatus(domain.expiryDate)
                          return (
                            <TableRow key={domain.id}>
                              <TableCell className="font-medium">{domain.name}</TableCell>
                              <TableCell>{domain.provider_name || '未设置'}</TableCell>
                              <TableCell>
                                {domain.expiryDate ? format(parseISO(domain.expiryDate), 'yyyy-MM-dd', { locale: zhCN }) : '-'}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.color}`}>
                                  {status.text}
                                </span>
                                {domain.autoRenew && (
                                  <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-status-info-bg text-status-info">
                                    自动续期
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {domain.renewalPrice ? `¥${domain.renewalPrice}` : '-'}
                              </TableCell>
                              <TableCell>
                                {domain.reminders && domain.reminders.length > 0
                                  ? (
                                      <span className="flex items-center gap-1 text-sm">
                                        <AlertTriangle className="h-3 w-3" />
                                        {domain.reminders.map(r => r.daysBefore).join('/')}
                                        {' '}
                                        天
                                      </span>
                                    )
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(domain)}
                                    title="编辑"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {supportsDNS(domain.providerId) && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openDNSDialog(domain.id)}
                                      title="DNS记录"
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-status-danger"
                                    onClick={() => handleDelete(domain.id)}
                                    title="删除"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                    <div className="border-t">
                      <DataTablePagination
                        itemsPerPage={itemsPerPage}
                        totalItems={domains.length}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={handleItemsPerPageChange}
                      />
                    </div>
                  </>
                )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDomain ? '编辑域名' : '添加域名'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDomainSubmit(onDomainSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                域名
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Input
                id="name"
                {...registerDomain('name', { required: '请输入域名' })}
                placeholder="example.com"
                aria-invalid={!!domainErrors.name}
              />
              {domainErrors.name && (
                <p className="text-xs text-status-danger">{domainErrors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">服务商</Label>
              <Controller
                control={domainControl}
                name="providerId"
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={value => field.onChange(value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择服务商" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      {providers.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">过期日期</Label>
              <Input
                id="expiry_date"
                type="date"
                {...registerDomain('expiryDate')}
              />
            </div>
            {supportsAutoRenew(watchedProviderId ? Number(watchedProviderId) : null) && (
              <>
                <div className="flex items-center space-x-2">
                  <Controller
                    control={domainControl}
                    name="autoRenew"
                    render={({ field }) => (
                      <Switch
                        id="auto_renew"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="auto_renew">自动续期</Label>
                </div>
                {watchedAutoRenew && watchedProviderId && renderAutoRenewDaysField()}
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="renewal_price">续期价格（元）</Label>
              <Input
                id="renewal_price"
                type="number"
                step="0.01"
                {...registerDomain('renewalPrice')}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                {...registerDomain('notes')}
                placeholder="备注信息"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit">{editingDomain ? '更新' : '创建'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dnsDialogOpen} onOpenChange={setDnsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>DNS记录管理</DialogTitle>
          </DialogHeader>

          <div className="mb-6 max-h-48 overflow-y-auto">
            {currentDomainDNSRecords.length === 0
              ? (
                  <p className="text-sm text-muted-foreground text-center py-4">暂无DNS记录</p>
                )
              : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">类型</TableHead>
                        <TableHead>主机名</TableHead>
                        <TableHead>记录值</TableHead>
                        <TableHead className="w-20">TTL</TableHead>
                        <TableHead className="w-20">优先级</TableHead>
                        <TableHead className="w-15">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentDomainDNSRecords.map(record => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <span className="font-mono text-sm px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {record.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{record.name}</TableCell>
                          <TableCell className="font-mono text-sm text-secondary-foreground">{record.value}</TableCell>
                          <TableCell className="text-sm">
                            {record.ttl}
                            s
                          </TableCell>
                          <TableCell className="text-sm">{record.priority || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openDNSDialog(selectedDomainId!, record)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-status-danger"
                                onClick={() => handleDNSRecordDelete(record.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">{editingDNSRecord ? '编辑记录' : '添加记录'}</span>
              {editingDNSRecord && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingDNSRecord(null)
                    resetDNSForm({
                      type: 'A',
                      name: '',
                      value: '',
                      ttl: '3600',
                      priority: '',
                    })
                  }}
                >
                  取消编辑
                </Button>
              )}
            </div>

            <form onSubmit={handleDNSSubmit(onDNSSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dns_type">
                    记录类型
                    <span className="text-status-danger ml-1">*</span>
                  </Label>
                  <Controller
                    control={dnsControl}
                    name="type"
                    rules={{ required: '请选择记录类型' }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {DNS_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {dnsErrors.type && (
                    <p className="text-xs text-status-error">{dnsErrors.type.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dns_name">
                    主机名
                    <span className="text-status-danger ml-1">*</span>
                  </Label>
                  <Input
                    id="dns_name"
                    {...registerDNS('name', { required: '请输入主机名' })}
                    placeholder="www, @, mail"
                    aria-invalid={!!dnsErrors.name}
                  />
                  {dnsErrors.name && (
                    <p className="text-xs text-status-danger">{dnsErrors.name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dns_value">
                    记录值
                    <span className="text-status-danger ml-1">*</span>
                  </Label>
                  <Input
                    id="dns_value"
                    {...registerDNS('value', { required: '请输入记录值' })}
                    placeholder="IP地址或目标域名"
                    aria-invalid={!!dnsErrors.value}
                  />
                  {dnsErrors.value && (
                    <p className="text-xs text-status-error">{dnsErrors.value.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dns_ttl">
                    TTL（秒）
                    <span className="text-status-danger ml-1">*</span>
                  </Label>
                  <Input
                    id="dns_ttl"
                    type="number"
                    {...registerDNS('ttl', {
                      required: '请输入TTL',
                      min: { value: 1, message: 'TTL必须大于0' },
                    })}
                    placeholder="3600"
                    aria-invalid={!!dnsErrors.ttl}
                  />
                  {dnsErrors.ttl && (
                    <p className="text-xs text-status-error">{dnsErrors.ttl.message}</p>
                  )}
                </div>
              </div>

              {(watchedDNSType === 'MX' || watchedDNSType === 'SRV') && (
                <div className="space-y-2">
                  <Label htmlFor="dns_priority">优先级</Label>
                  <Input
                    id="dns_priority"
                    type="number"
                    {...registerDNS('priority')}
                    placeholder="10"
                  />
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDnsDialogOpen(false)}>
                  关闭
                </Button>
                <Button type="submit">
                  {editingDNSRecord ? '更新记录' : '添加记录'}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
