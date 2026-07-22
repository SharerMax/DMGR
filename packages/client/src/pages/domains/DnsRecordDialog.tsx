import type { CreateDNSRecordInput, DNSRecord } from '@/stores/dnsRecords'
import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const DNS_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR', 'SOA']

interface DNSFormValues {
  type: string
  name: string
  value: string
  ttl: string
  priority: string
}

interface DnsRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  domainId: number | null
  records: DNSRecord[]
  onSubmitRecord: (payload: CreateDNSRecordInput, editingRecord: DNSRecord | null) => Promise<void>
  onDeleteRecord: (id: number) => void
}

export function DnsRecordDialog({
  open,
  onOpenChange,
  domainId,
  records,
  onSubmitRecord,
  onDeleteRecord,
}: DnsRecordDialogProps) {
  const [editingRecord, setEditingRecord] = useState<DNSRecord | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<DNSFormValues>({
    defaultValues: {
      type: 'A',
      name: '',
      value: '',
      ttl: '3600',
      priority: '',
    },
  })

  const watchedDNSType = watch('type')

  useEffect(() => {
    if (!open)
      return
    if (editingRecord) {
      reset({
        type: editingRecord.type,
        name: editingRecord.name,
        value: editingRecord.value,
        ttl: editingRecord.ttl.toString(),
        priority: editingRecord.priority?.toString() || '',
      })
    }
    else {
      reset({
        type: 'A',
        name: '',
        value: '',
        ttl: '3600',
        priority: '',
      })
    }
  }, [open, editingRecord, reset])

  const onDNSSubmit = async (data: DNSFormValues) => {
    try {
      const payload = {
        type: data.type as CreateDNSRecordInput['type'],
        name: data.name,
        value: data.value,
        ttl: Number(data.ttl) || 3600,
        priority: data.priority ? Number(data.priority) : undefined,
        domainId: domainId!,
      }

      await onSubmitRecord(payload, editingRecord)
      reset({
        type: 'A',
        name: '',
        value: '',
        ttl: '3600',
        priority: '',
      })
    }
    catch (error: any) {
      toast.error(error.message || '操作失败')
    }
  }

  const currentDomainDNSRecords = records.filter(r => r.domainId === domainId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                              onClick={() => setEditingRecord(record)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-status-danger"
                              onClick={() => onDeleteRecord(record.id)}
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
            <span className="font-medium">{editingRecord ? '编辑记录' : '添加记录'}</span>
            {editingRecord && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingRecord(null)}
              >
                取消编辑
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit(onDNSSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dns_type">
                  记录类型
                  <span className="text-status-danger ml-1">*</span>
                </Label>
                <Controller
                  control={control}
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
                {errors.type && (
                  <p className="text-xs text-status-error">{errors.type.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dns_name">
                  主机名
                  <span className="text-status-danger ml-1">*</span>
                </Label>
                <Input
                  id="dns_name"
                  {...register('name', { required: '请输入主机名' })}
                  placeholder="www, @, mail"
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-status-error">{errors.name.message}</p>
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
                  {...register('value', { required: '请输入记录值' })}
                  placeholder="IP地址或目标域名"
                  aria-invalid={!!errors.value}
                />
                {errors.value && (
                  <p className="text-xs text-status-error">{errors.value.message}</p>
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
                  {...register('ttl', {
                    required: '请输入TTL',
                    min: { value: 1, message: 'TTL必须大于0' },
                  })}
                  placeholder="3600"
                  aria-invalid={!!errors.ttl}
                />
                {errors.ttl && (
                  <p className="text-xs text-status-error">{errors.ttl.message}</p>
                )}
              </div>
            </div>

            {(watchedDNSType === 'MX' || watchedDNSType === 'SRV') && (
              <div className="space-y-2">
                <Label htmlFor="dns_priority">优先级</Label>
                <Input
                  id="dns_priority"
                  type="number"
                  {...register('priority')}
                  placeholder="10"
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
              <Button type="submit">
                {editingRecord ? '更新记录' : '添加记录'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
