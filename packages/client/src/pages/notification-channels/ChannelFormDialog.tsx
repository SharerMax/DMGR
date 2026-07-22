import type { CreateChannelInput, NotificationChannel } from '@/stores/notificationChannels'
import { AlertTriangle } from 'lucide-react'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface ChannelFormValues {
  type: CreateChannelInput['type']
  name: string
  configValue: string
  chatId: string
  isActive: boolean
}

interface ChannelFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingChannel: NotificationChannel | null
  smtpConfigured: boolean
  onSubmit: (payload: CreateChannelInput, editingChannel: NotificationChannel | null) => Promise<void>
}

export function ChannelFormDialog({
  open,
  onOpenChange,
  editingChannel,
  smtpConfigured,
  onSubmit,
}: ChannelFormDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ChannelFormValues>({
    defaultValues: {
      type: 'email',
      name: '',
      configValue: '',
      chatId: '',
      isActive: true,
    },
  })

  const watchedType = watch('type')

  useEffect(() => {
    if (!open)
      return
    if (editingChannel) {
      reset({
        type: editingChannel.type,
        name: editingChannel.name,
        configValue: editingChannel.type === 'email'
          ? (editingChannel.config.email as string) || ''
          : editingChannel.type === 'webhook'
            ? (editingChannel.config.url as string) || ''
            : editingChannel.type === 'telegram'
              ? (editingChannel.config.botToken as string) || ''
              : editingChannel.type === 'feishu' ? (editingChannel.config.webhookUrl as string) || '' : '',
        chatId: editingChannel.type === 'telegram' ? (editingChannel.config.chatId as string) || '' : '',
        isActive: editingChannel.isActive,
      })
    }
    else {
      reset({
        type: 'email',
        name: '',
        configValue: '',
        chatId: '',
        // 邮件渠道：SMTP 未配置时默认禁用
        isActive: smtpConfigured,
      })
    }
  }, [open, editingChannel, reset, smtpConfigured])

  // 邮件渠道：SMTP 未配置时强制禁用
  useEffect(() => {
    if (watchedType === 'email' && !smtpConfigured) {
      setValue('isActive', false)
    }
  }, [watchedType, smtpConfigured, setValue])

  const getConfigLabel = () => {
    if (watchedType === 'email')
      return '邮箱地址'
    if (watchedType === 'telegram')
      return 'Bot Token'
    if (watchedType === 'feishu')
      return 'Webhook URL'
    return 'Webhook URL'
  }

  const getPlaceholder = () => {
    if (watchedType === 'email')
      return 'example@email.com'
    if (watchedType === 'telegram')
      return '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'
    if (watchedType === 'feishu')
      return 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx'
    return 'https://example.com/webhook'
  }

  const onSubmitForm = async (data: ChannelFormValues) => {
    try {
      const config: Record<string, unknown> = {}
      if (data.type === 'email') {
        config.email = data.configValue
      }
      else if (data.type === 'webhook') {
        config.url = data.configValue
      }
      else if (data.type === 'telegram') {
        config.botToken = data.configValue
        config.chatId = data.chatId || ''
      }
      else if (data.type === 'feishu') {
        config.webhookUrl = data.configValue
      }

      const payload = {
        type: data.type,
        name: data.name,
        config,
        isActive: data.isActive,
      }

      await onSubmit(payload, editingChannel)
      onOpenChange(false)
    }
    catch (error: any) {
      toast.error(error.message || '保存失败')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingChannel ? '编辑通知渠道' : '添加通知渠道'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">
              渠道类型
              <span className="text-status-danger ml-1">*</span>
            </Label>
            <Controller
              control={control}
              name="type"
              rules={{ required: '请选择渠道类型' }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择渠道类型">
                      {(value: string | null) => {
                        if (!value)
                          return null
                        const labels: Record<string, string> = {
                          email: '邮件',
                          webhook: 'Webhook',
                          telegram: 'Telegram',
                          feishu: '飞书',
                        }
                        return labels[value] || value
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">邮件</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="telegram">Telegram</SelectItem>
                    <SelectItem value="feishu">飞书</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-xs text-status-error">{errors.type.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">
              渠道名称
              <span className="text-status-danger ml-1">*</span>
            </Label>
            <Input
              id="name"
              {...register('name', { required: '请输入渠道名称' })}
              placeholder="输入渠道名称"
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-xs text-status-error">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="configValue">
              {getConfigLabel()}
              <span className="text-status-danger ml-1">*</span>
            </Label>
            <Input
              id="configValue"
              {...register('configValue', {
                required: `请输入${getConfigLabel()}`,
                validate: (value) => {
                  if (watchedType === 'email') {
                    return /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(value) || '请输入有效的邮箱地址'
                  }
                  if (watchedType === 'webhook' || watchedType === 'feishu') {
                    return /^https?:\/\//i.test(value) || '请输入有效的 URL'
                  }
                  return true
                },
              })}
              placeholder={getPlaceholder()}
              aria-invalid={!!errors.configValue}
            />
            {errors.configValue && (
              <p className="text-xs text-status-error">{errors.configValue.message}</p>
            )}
          </div>
          {watchedType === 'telegram' && (
            <div className="space-y-2">
              <Label htmlFor="chatId">
                Chat ID
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Input
                id="chatId"
                {...register('chatId', { required: watchedType === 'telegram' ? '请输入 Chat ID' : false })}
                placeholder="123456789"
                aria-invalid={!!errors.chatId}
              />
              {errors.chatId && (
                <p className="text-xs text-status-error">{errors.chatId.message}</p>
              )}
            </div>
          )}
          {watchedType === 'email' && !smtpConfigured && (
            <div className="flex items-start gap-2 rounded-md bg-status-warning-bg p-3 text-sm text-status-warning">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                SMTP 服务器未配置，邮件渠道将默认禁用。
                请先点击上方「SMTP 配置」按钮完成配置。
              </span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={watchedType === 'email' && !smtpConfigured}
                />
              )}
            />
            <Label htmlFor="isActive">启用状态</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit">
              {editingChannel ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
