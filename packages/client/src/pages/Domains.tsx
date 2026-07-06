import type { CreateDNSRecordInput, DNSRecord } from '@/stores/dnsRecords'
import type { Domain } from '@/stores/domains'
import { differenceInDays, format, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { AlertTriangle, Pencil, Plus, Settings, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { DomainFilter } from '@/components/DomainFilter'
import { Pagination } from '@/components/Pagination'
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

export default function Domains() {
  const { domains, loading, fetchDomains, createDomain, updateDomain, deleteDomain } = useDomainStore()
  const { providers, providerTypes, fetchProviders, fetchProviderTypes } = useProviderStore()
  const { records, fetchRecords, createRecord, updateRecord, deleteRecord } = useDNSRecordStore()
  const { confirm } = useConfirm()

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dnsDialogOpen, setDnsDialogOpen] = useState(false)
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null)
  const [editingDNSRecord, setEditingDNSRecord] = useState<DNSRecord | null>(null)
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null)

  const [filters, setFilters] = useState({
    search: '',
    providerId: 'all',
  })

  const [formData, setFormData] = useState({
    name: '',
    providerId: '',
    expiryDate: '',
    autoRenew: false,
    autoRenewDays: '',
    renewalPrice: '',
    notes: '',
  })
  const [dnsFormData, setDnsFormData] = useState<CreateDNSRecordInput>({
    domainId: 0,
    type: 'A',
    name: '',
    value: '',
    ttl: 3600,
    priority: undefined,
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

  // 渲染自动续期阈值配置字段
  const renderAutoRenewDaysField = () => {
    const selectedProvider = providers.find(p => p.id === Number(formData.providerId))
    const providerType = selectedProvider
      ? providerTypes.find(t => t.id === selectedProvider.type)
      : null

    if (providerType?.supportsAutoRenew && providerType.maxRenewalDays) {
      return (
        <div className="space-y-2">
          <Label htmlFor="auto_renew_days">
            自动续期阈值（天）
            <span className="text-xs text-gray-500 ml-2">
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
            value={formData.autoRenewDays}
            onChange={e => setFormData({ ...formData, autoRenewDays: e.target.value })}
            placeholder={`过期前多少天自动续期（最大 ${providerType.maxRenewalDays} 天）`}
          />
          <p className="text-xs text-gray-500">
            域名过期前指定天数时触发自动续期
          </p>
        </div>
      )
    }

    if (formData.providerId && !providerType?.supportsAutoRenew) {
      return (
        <p className="text-sm text-yellow-600">
          当前服务商不支持自动续期
        </p>
      )
    }

    return null
  }

  const resetForm = () => {
    setFormData({
      name: '',
      providerId: '',
      expiryDate: '',
      autoRenew: false,
      autoRenewDays: '',
      renewalPrice: '',
      notes: '',
    })
    setEditingDomain(null)
  }

  const resetDnsForm = () => {
    setDnsFormData({
      domainId: selectedDomainId || 0,
      type: 'A',
      name: '',
      value: '',
      ttl: 3600,
      priority: undefined,
    })
    setEditingDNSRecord(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (domain: Domain) => {
    setEditingDomain(domain)
    setFormData({
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
      setDnsFormData({
        domainId: record.domainId,
        type: record.type,
        name: record.name,
        value: record.value,
        ttl: record.ttl,
        priority: record.priority,
      })
    }
    else {
      resetDnsForm()
    }
    setDnsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // 获取服务商配置以验证 autoRenewDays
      const selectedProvider = formData.providerId
        ? providers.find(p => p.id === Number(formData.providerId))
        : null
      const providerType = selectedProvider
        ? providerTypes.find(t => t.id === selectedProvider.type)
        : null

      // 验证自动续期阈值
      if (formData.autoRenew && formData.autoRenewDays) {
        const renewDays = Number(formData.autoRenewDays)
        if (providerType?.maxRenewalDays && renewDays > providerType.maxRenewalDays) {
          toast.warning(`自动续期阈值不能超过服务商限制的 ${providerType.maxRenewalDays} 天`)
          return
        }
      }

      const data = {
        name: formData.name,
        providerId: formData.providerId ? Number(formData.providerId) : null,
        expiryDate: formData.expiryDate || null,
        autoRenew: formData.autoRenew,
        autoRenewDays: formData.autoRenew && formData.autoRenewDays
          ? Number(formData.autoRenewDays)
          : null,
        renewalPrice: formData.renewalPrice ? Number(formData.renewalPrice) : null,
        notes: formData.notes || null,
      }

      if (editingDomain) {
        await updateDomain(editingDomain.id, data)
      }
      else {
        await createDomain(data)
      }
      setDialogOpen(false)
      resetForm()
    }
    catch (error: any) {
      toast.error(error.message || '操作失败')
    }
  }

  const handleDNSRecordSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    try {
      if (editingDNSRecord) {
        await updateRecord(editingDNSRecord.id, {
          type: dnsFormData.type,
          name: dnsFormData.name,
          value: dnsFormData.value,
          ttl: dnsFormData.ttl,
          priority: dnsFormData.priority,
        })
      }
      else {
        await createRecord({
          ...dnsFormData,
          domainId: selectedDomainId!,
        })
      }
      resetDnsForm()
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
      return { text: '未知', color: 'text-gray-600', bg: 'bg-gray-100' }

    const days = differenceInDays(parseISO(expiryDate), new Date())
    if (days < 0)
      return { text: '已过期', color: 'text-red-600', bg: 'bg-red-100' }
    if (days <= 7)
      return { text: `${days}天后过期`, color: 'text-red-600', bg: 'bg-red-100' }
    if (days <= 30)
      return { text: `${days}天后过期`, color: 'text-orange-600', bg: 'bg-orange-100' }
    if (days <= 90)
      return { text: `${days}天后过期`, color: 'text-yellow-600', bg: 'bg-yellow-100' }
    return { text: `${days}天后过期`, color: 'text-green-600', bg: 'bg-green-100' }
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
        <CardContent className="pt-6">
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
              <span className="text-sm text-gray-500">
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
        <CardContent className="p-0">
          {loading
            ? (
                <div className="text-center py-12">加载中...</div>
              )
            : domains.length === 0
              ? (
                  <div className="text-center py-12 text-gray-500">
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
                          <TableHead className="w-[140px]">操作</TableHead>
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
                                  <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-600">
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
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openDNSDialog(domain.id)}
                                    title="DNS记录"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500"
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
                      <Pagination
                        itemsPerPage={itemsPerPage}
                        totalItems={domains.length}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">域名</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">服务商</Label>
              <Select
                value={formData.providerId || 'none'}
                onValueChange={value => setFormData({ ...formData, providerId: value === 'none' ? '' : value })}
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">过期日期</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiryDate}
                onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto_renew"
                checked={formData.autoRenew}
                onCheckedChange={checked => setFormData({ ...formData, autoRenew: checked })}
              />
              <Label htmlFor="auto_renew">自动续期</Label>
            </div>
            {formData.autoRenew && formData.providerId && renderAutoRenewDaysField()}
            <div className="space-y-2">
              <Label htmlFor="renewal_price">续期价格（元）</Label>
              <Input
                id="renewal_price"
                type="number"
                step="0.01"
                value={formData.renewalPrice}
                onChange={e => setFormData({ ...formData, renewalPrice: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>DNS记录管理</DialogTitle>
          </DialogHeader>

          <div className="mb-6 max-h-48 overflow-y-auto">
            {currentDomainDNSRecords.length === 0
              ? (
                  <p className="text-sm text-gray-500 text-center py-4">暂无DNS记录</p>
                )
              : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">类型</TableHead>
                        <TableHead>主机名</TableHead>
                        <TableHead>记录值</TableHead>
                        <TableHead className="w-[80px]">TTL</TableHead>
                        <TableHead className="w-[80px]">优先级</TableHead>
                        <TableHead className="w-[60px]">操作</TableHead>
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
                          <TableCell className="font-mono text-sm text-gray-600">{record.value}</TableCell>
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
                                className="h-7 w-7 text-red-500"
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
              <span className="font-medium">添加记录</span>
              {editingDNSRecord && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetDnsForm()
                  }}
                >
                  取消编辑
                </Button>
              )}
            </div>

            <form onSubmit={handleDNSRecordSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dns_type">记录类型</Label>
                  <Select
                    value={dnsFormData.type}
                    onValueChange={value => setDnsFormData({ ...dnsFormData, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {DNS_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dns_name">主机名</Label>
                  <Input
                    id="dns_name"
                    value={dnsFormData.name}
                    onChange={e => setDnsFormData({ ...dnsFormData, name: e.target.value })}
                    placeholder="www, @, mail"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dns_value">记录值</Label>
                  <Input
                    id="dns_value"
                    value={dnsFormData.value}
                    onChange={e => setDnsFormData({ ...dnsFormData, value: e.target.value })}
                    placeholder="IP地址或目标域名"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dns_ttl">TTL（秒）</Label>
                  <Input
                    id="dns_ttl"
                    type="number"
                    value={dnsFormData.ttl}
                    onChange={e => setDnsFormData({ ...dnsFormData, ttl: Number.parseInt(e.target.value) || 3600 })}
                    placeholder="3600"
                  />
                </div>
              </div>

              {(dnsFormData.type === 'MX' || dnsFormData.type === 'SRV') && (
                <div className="space-y-2">
                  <Label htmlFor="dns_priority">优先级</Label>
                  <Input
                    id="dns_priority"
                    type="number"
                    value={dnsFormData.priority || ''}
                    onChange={e => setDnsFormData({ ...dnsFormData, priority: Number.parseInt(e.target.value) || undefined })}
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
