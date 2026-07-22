import type { CreateChannelInput } from '@/stores/notificationChannels'
import { AlertTriangle, Edit2, Mail, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useConfirm } from '@/hooks/useConfirm'
import { useNotificationChannelStore } from '@/stores/notificationChannels'
import { useSmtpSettingStore } from '@/stores/smtpSettings'

const channelTypeConfig = {
  email: { label: '邮件', color: 'bg-blue-100 text-blue-700' },
  webhook: { label: 'Webhook', color: 'bg-purple-100 text-purple-700' },
  telegram: { label: 'Telegram', color: 'bg-cyan-100 text-cyan-700' },
  feishu: { label: '飞书', color: 'bg-orange-100 text-orange-700' },
}

interface ChannelFormValues {
  type: CreateChannelInput['type']
  name: string
  configValue: string
  chatId: string
  isActive: boolean
}

interface SmtpFormValues {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

export default function NotificationChannels() {
  const { channels, loading, fetchChannels, createChannel, updateChannel, deleteChannel }
    = useNotificationChannelStore()
  const { confirm } = useConfirm()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<typeof channels[0] | null>(null)
  const { setting: smtpSetting, fetchSmtpSetting, updateSmtpSetting } = useSmtpSettingStore()
  const [smtpDialogOpen, setSmtpDialogOpen] = useState(false)
  const [smtpSaving, setSmtpSaving] = useState(false)

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

  const {
    register: registerSmtp,
    handleSubmit: handleSubmitSmtp,
    reset: resetSmtp,
    formState: { errors: smtpErrors },
  } = useForm<SmtpFormValues>({
    defaultValues: {
      host: '',
      port: 587,
      user: '',
      pass: '',
      from: '',
    },
  })

  const watchedType = watch('type')
  const smtpConfigured = smtpSetting?.configured ?? false

  useEffect(() => {
    fetchChannels()
    fetchSmtpSetting()
  }, [fetchChannels, fetchSmtpSetting])

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

  const handleOpenDialog = (channel?: typeof channels[0]) => {
    if (channel) {
      setEditingChannel(channel)
      reset({
        type: channel.type,
        name: channel.name,
        configValue: channel.type === 'email'
          ? (channel.config.email as string) || ''
          : channel.type === 'webhook'
            ? (channel.config.url as string) || ''
            : channel.type === 'telegram'
              ? (channel.config.botToken as string) || ''
              : channel.type === 'feishu' ? (channel.config.webhookUrl as string) || '' : '',
        chatId: channel.type === 'telegram' ? (channel.config.chatId as string) || '' : '',
        isActive: channel.isActive,
      })
    }
    else {
      setEditingChannel(null)
      reset({
        type: 'email',
        name: '',
        configValue: '',
        chatId: '',
        // 邮件渠道：SMTP 未配置时默认禁用
        isActive: smtpConfigured,
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingChannel(null)
  }

  const handleOpenSmtpDialog = () => {
    if (smtpSetting) {
      resetSmtp({
        host: smtpSetting.host,
        port: smtpSetting.port,
        user: smtpSetting.user,
        // 密码不回填，留空表示不修改
        pass: '',
        from: smtpSetting.from,
      })
    }
    setSmtpDialogOpen(true)
  }

  const onSubmitSmtp = async (data: SmtpFormValues) => {
    setSmtpSaving(true)
    try {
      await updateSmtpSetting(data)
      toast.success('SMTP 配置已保存')
      setSmtpDialogOpen(false)
    }
    catch (error: any) {
      toast.error(error.message || '保存 SMTP 配置失败')
    }
    finally {
      setSmtpSaving(false)
    }
  }

  const onSubmit = async (data: ChannelFormValues) => {
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

      if (editingChannel) {
        await updateChannel(editingChannel.id, payload)
        toast.success('通知渠道已更新')
      }
      else {
        await createChannel(payload)
        toast.success('通知渠道已创建')
      }
      handleCloseDialog()
    }
    catch (error: any) {
      toast.error(error.message || '保存失败')
    }
  }

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: '删除通知渠道',
      description: '确定要删除这个通知渠道吗？此操作不可撤销。',
      confirmText: '删除',
      destructive: true,
    })
    if (!confirmed)
      return
    try {
      await deleteChannel(id)
      toast.success('通知渠道已删除')
    }
    catch (error: any) {
      toast.error(error.message || '删除失败')
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">通知渠道列表</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenSmtpDialog}>
            <Mail className="h-4 w-4 mr-2" />
            SMTP 配置
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            添加渠道
          </Button>
        </div>
      </div>

      <Card>
        <CardContent>
          {loading
            ? (
                <div className="text-center py-12">加载中...</div>
              )
            : channels.length === 0
              ? (
                  <div className="text-center py-12 text-muted-foreground">
                    暂无通知渠道，点击上方按钮添加
                  </div>
                )
              : (
                  <div className="divide-y">
                    {channels.map(channel => (
                      <div
                        key={channel.id}
                        className="flex items-center justify-between p-4 hover:bg-muted"
                      >
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${channelTypeConfig[channel.type].color}`}>
                            {channelTypeConfig[channel.type].label}
                          </span>
                          <div>
                            <div className="font-medium">{channel.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {channel.type === 'email' && (channel.config.email as string)}
                              {channel.type === 'webhook' && (channel.config.url as string)}
                              {channel.type === 'telegram' && `Chat ID: ${channel.config.chatId as string || ''}`}
                              {channel.type === 'feishu' && (channel.config.webhookUrl as string)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            channel.isActive ? 'bg-status-success-bg text-status-success' : 'bg-status-disabled-bg text-status-disabled'
                          }`}
                          >
                            {channel.isActive ? '已启用' : '已禁用'}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(channel)}
                              title="编辑"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-status-danger"
                              onClick={() => handleDelete(channel.id)}
                              title="删除"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingChannel ? '编辑通知渠道' : '添加通知渠道'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                取消
              </Button>
              <Button type="submit">
                {editingChannel ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SMTP 配置 Dialog */}
      <Dialog open={smtpDialogOpen} onOpenChange={setSmtpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SMTP 服务器配置</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitSmtp(onSubmitSmtp)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="smtp-host">
                SMTP 服务器地址
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Input
                id="smtp-host"
                {...registerSmtp('host', { required: '请输入 SMTP 服务器地址' })}
                placeholder="smtp.example.com"
              />
              {smtpErrors.host && (
                <p className="text-xs text-status-error">{smtpErrors.host.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port">
                端口
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Input
                id="smtp-port"
                type="number"
                {...registerSmtp('port', {
                  required: '请输入端口',
                  valueAsNumber: true,
                  min: { value: 1, message: '端口必须大于 0' },
                  max: { value: 65535, message: '端口必须小于 65536' },
                })}
                placeholder="587"
              />
              {smtpErrors.port && (
                <p className="text-xs text-status-error">{smtpErrors.port.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-user">
                用户名
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Input
                id="smtp-user"
                {...registerSmtp('user', { required: '请输入用户名' })}
                placeholder="user@example.com"
              />
              {smtpErrors.user && (
                <p className="text-xs text-status-error">{smtpErrors.user.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-pass">
                密码
                {smtpSetting?.pass && (
                  <span className="text-status-danger ml-1">*</span>
                )}
              </Label>
              <Input
                id="smtp-pass"
                type="password"
                {...registerSmtp('pass', {
                  required: smtpSetting?.pass ? false : '请输入密码',
                })}
                placeholder={smtpSetting?.pass ? '留空表示不修改' : '请输入密码'}
              />
              {smtpErrors.pass && (
                <p className="text-xs text-status-error">{smtpErrors.pass.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-from">
                发件人地址
                <span className="text-status-danger ml-1">*</span>
              </Label>
              <Input
                id="smtp-from"
                {...registerSmtp('from', { required: '请输入发件人地址' })}
                placeholder="noreply@example.com"
              />
              {smtpErrors.from && (
                <p className="text-xs text-status-error">{smtpErrors.from.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSmtpDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={smtpSaving}>
                {smtpSaving ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
