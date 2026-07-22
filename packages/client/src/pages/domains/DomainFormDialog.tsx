import type { CreateDomainInput, Domain } from '@/stores/domains'
import type { Provider, ProviderType } from '@/stores/providers'
import { useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface DomainFormValues {
  name: string
  providerId: string
  expiryDate: string
  autoRenew: boolean
  autoRenewDays: string
  renewalPrice: string
  notes: string
}

interface DomainFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingDomain: Domain | null
  providers: Provider[]
  providerTypes: ProviderType[]
  onSubmit: (payload: CreateDomainInput, editingDomain: Domain | null) => Promise<void>
}

export function DomainFormDialog({
  open,
  onOpenChange,
  editingDomain,
  providers,
  providerTypes,
  onSubmit,
}: DomainFormDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
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

  const watchedProviderId = watch('providerId')
  const watchedAutoRenew = watch('autoRenew')

  useEffect(() => {
    if (!open)
      return
    if (editingDomain) {
      reset({
        name: editingDomain.name,
        providerId: editingDomain.providerId?.toString() || '',
        expiryDate: editingDomain.expiryDate?.split('T')[0] || '',
        autoRenew: !!editingDomain.autoRenew,
        autoRenewDays: editingDomain.autoRenewDays?.toString() || '',
        renewalPrice: editingDomain.renewalPrice?.toString() || '',
        notes: editingDomain.notes || '',
      })
    }
    else {
      reset({
        name: '',
        providerId: '',
        expiryDate: '',
        autoRenew: false,
        autoRenewDays: '',
        renewalPrice: '',
        notes: '',
      })
    }
  }, [open, editingDomain, reset])

  const getCurrentProviderType = () => {
    const selectedProvider = watchedProviderId
      ? providers.find(p => p.id === Number(watchedProviderId))
      : null
    return selectedProvider
      ? providerTypes.find(t => t.id === selectedProvider.type)
      : null
  }

  const supportsAutoRenew = (providerId: number | null | undefined) => {
    if (!providerId)
      return false
    const provider = providers.find(p => p.id === providerId)
    if (!provider)
      return false
    const typeConfig = providerTypes.find(t => t.id === provider.type)
    return typeConfig?.features.autoRenew === true
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
            {...register('autoRenewDays', {
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
            aria-invalid={!!errors.autoRenewDays}
          />
          <p className="text-xs text-muted-foreground">
            域名过期前指定天数时触发自动续期
          </p>
          {errors.autoRenewDays && (
            <p className="text-xs text-status-danger">{errors.autoRenewDays.message}</p>
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

      await onSubmit(payload, editingDomain)
      onOpenChange(false)
    }
    catch (error: any) {
      toast.error(error.message || '操作失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingDomain ? '编辑域名' : '添加域名'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onDomainSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              域名
              <span className="text-status-danger ml-1">*</span>
            </Label>
            <Input
              id="name"
              {...register('name', { required: '请输入域名' })}
              placeholder="example.com"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-status-danger">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider">服务商</Label>
            <Controller
              control={control}
              name="providerId"
              render={({ field }) => (
                <Select
                  value={field.value || 'none'}
                  onValueChange={value => field.onChange(value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择服务商">
                      {(value: string | null) => {
                        if (!value || value === 'none')
                          return '无'
                        return providers.find(p => p.id.toString() === value)?.name || '未知'
                      }}
                    </SelectValue>
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
              {...register('expiryDate')}
            />
          </div>
          {supportsAutoRenew(watchedProviderId ? Number(watchedProviderId) : null) && (
            <>
              <div className="flex items-center space-x-2">
                <Controller
                  control={control}
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
              {...register('renewalPrice')}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">备注</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="备注信息"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">{editingDomain ? '更新' : '创建'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
