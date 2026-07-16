import type { CreateChannelInput } from '@/stores/notificationChannels'
import { Edit2, Plus, Trash2 } from 'lucide-react'
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
  defaultDays: string
  isActive: boolean
}

export default function NotificationChannels() {
  const { channels, loading, fetchChannels, createChannel, updateChannel, deleteChannel }
    = useNotificationChannelStore()
  const { confirm } = useConfirm()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<typeof channels[0] | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ChannelFormValues>({
    defaultValues: {
      type: 'email',
      name: '',
      configValue: '',
      chatId: '',
      defaultDays: '90',
      isActive: true,
    },
  })

  const watchedType = watch('type')

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

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
        defaultDays: channel.defaultDays.toString(),
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
        defaultDays: '90',
        isActive: true,
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingChannel(null)
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
        defaultDays: Number(data.defaultDays) || 90,
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
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          添加渠道
        </Button>
      </div>

      <Card>
        <CardContent>
          {loading
            ? (
                <div className="text-center py-12">加载中...</div>
              )
            : channels.length === 0
              ? (
                  <div className="text-center py-12 text-gray-500">
                    暂无通知渠道，点击上方按钮添加
                  </div>
                )
              : (
                  <div className="divide-y">
                    {channels.map(channel => (
                      <div
                        key={channel.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${channelTypeConfig[channel.type].color}`}>
                            {channelTypeConfig[channel.type].label}
                          </span>
                          <div>
                            <div className="font-medium">{channel.name}</div>
                            <div className="text-sm text-gray-500">
                              {channel.type === 'email' && (channel.config.email as string)}
                              {channel.type === 'webhook' && (channel.config.url as string)}
                              {channel.type === 'telegram' && `Chat ID: ${channel.config.chatId as string || ''}`}
                              {channel.type === 'feishu' && (channel.config.webhookUrl as string)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">
                            提前
                            {' '}
                            {channel.defaultDays}
                            {' '}
                            天
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            channel.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
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
                              className="text-red-500"
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
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Controller
                control={control}
                name="type"
                rules={{ required: '请选择渠道类型' }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择渠道类型" />
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
                <p className="text-xs text-red-500">{errors.type.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">
                渠道名称
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="name"
                {...register('name', { required: '请输入渠道名称' })}
                placeholder="输入渠道名称"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="configValue">
                {getConfigLabel()}
                <span className="text-red-500 ml-1">*</span>
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
                <p className="text-xs text-red-500">{errors.configValue.message}</p>
              )}
            </div>
            {watchedType === 'telegram' && (
              <div className="space-y-2">
                <Label htmlFor="chatId">
                  Chat ID
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="chatId"
                  {...register('chatId', { required: watchedType === 'telegram' ? '请输入 Chat ID' : false })}
                  placeholder="123456789"
                  aria-invalid={!!errors.chatId}
                />
                {errors.chatId && (
                  <p className="text-xs text-red-500">{errors.chatId.message}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="defaultDays">
                默认提前提醒天数
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="defaultDays"
                type="number"
                {...register('defaultDays', {
                  required: '请输入提醒天数',
                  min: { value: 1, message: '天数不能小于1' },
                  max: { value: 365, message: '天数不能超过365' },
                })}
                placeholder="90"
                aria-invalid={!!errors.defaultDays}
              />
              {errors.defaultDays && (
                <p className="text-xs text-red-500">{errors.defaultDays.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch
                    id="isActive"
                    checked={field.value}
                    onCheckedChange={field.onChange}
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
    </>
  )
}
