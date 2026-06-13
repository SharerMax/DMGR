import type { CreateChannelInput } from '@/stores/notificationChannels'
import { Edit2, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
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
  sms: { label: '短信', color: 'bg-green-100 text-green-700' },
  webhook: { label: 'Webhook', color: 'bg-purple-100 text-purple-700' },
}

export default function NotificationChannels() {
  const { channels, loading, fetchChannels, createChannel, updateChannel, deleteChannel }
    = useNotificationChannelStore()
  const { confirm } = useConfirm()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<typeof channels[0] | null>(null)
  const [formData, setFormData] = useState<CreateChannelInput & { configValue: string }>({
    type: 'email',
    name: '',
    config: {},
    configValue: '',
    defaultDays: 90,
    isActive: true,
  })

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  const handleOpenDialog = (channel?: typeof channels[0]) => {
    if (channel) {
      setEditingChannel(channel)
      setFormData({
        type: channel.type,
        name: channel.name,
        config: channel.config,
        configValue: channel.type === 'email'
          ? (channel.config.email as string) || ''
          : channel.type === 'webhook' ? (channel.config.url as string) || '' : '',
        defaultDays: channel.defaultDays,
        isActive: channel.isActive,
      })
    }
    else {
      setEditingChannel(null)
      setFormData({
        type: 'email',
        name: '',
        config: {},
        configValue: '',
        defaultDays: 90,
        isActive: true,
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingChannel(null)
  }

  const handleSubmit = async () => {
    try {
      const config: Record<string, unknown> = {}
      if (formData.type === 'email') {
        config.email = formData.configValue
      }
      else if (formData.type === 'sms') {
        config.phone = formData.configValue
      }
      else if (formData.type === 'webhook') {
        config.url = formData.configValue
      }

      if (editingChannel) {
        await updateChannel(editingChannel.id, {
          type: formData.type,
          name: formData.name,
          config,
          defaultDays: formData.defaultDays,
          isActive: formData.isActive,
        })
      }
      else {
        await createChannel({
          type: formData.type,
          name: formData.name,
          config,
          defaultDays: formData.defaultDays,
          isActive: formData.isActive,
        })
      }
      handleCloseDialog()
    }
    catch (error) {
      console.error('Save channel error:', error)
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
    }
    catch (error) {
      console.error('Delete channel error:', error)
    }
  }

  const getPlaceholder = () => {
    if (formData.type === 'email')
      return 'example@email.com'
    if (formData.type === 'sms')
      return '13800138000'
    return 'https://example.com/webhook'
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
        <CardContent className="p-0">
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
                              {channel.type === 'sms' && (channel.config.phone as string)}
                              {channel.type === 'webhook' && (channel.config.url as string)}
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
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">渠道类型</Label>
              <Select
                value={formData.type}
                onValueChange={value => setFormData(prev => ({ ...prev, type: value as CreateChannelInput['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择渠道类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">邮件</SelectItem>
                  <SelectItem value="sms">短信</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">渠道名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="输入渠道名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="configValue">
                {formData.type === 'email' && '邮箱地址'}
                {formData.type === 'sms' && '手机号码'}
                {formData.type === 'webhook' && 'Webhook URL'}
              </Label>
              <Input
                id="configValue"
                value={formData.configValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, configValue: e.target.value }))}
                placeholder={getPlaceholder()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultDays">默认提前提醒天数</Label>
              <Input
                id="defaultDays"
                type="number"
                min="1"
                max="365"
                value={formData.defaultDays}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, defaultDays: Number.parseInt(e.target.value) || 90 }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">启用状态</Label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                取消
              </Button>
              <Button onClick={handleSubmit}>
                {editingChannel ? '保存' : '创建'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
