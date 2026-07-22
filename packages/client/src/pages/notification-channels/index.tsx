import type { CreateChannelInput, NotificationChannel } from '@/stores/notificationChannels'
import type { UpdateSmtpSettingInput } from '@/stores/smtpSettings'
import { Mail, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/hooks/useConfirm'
import { useNotificationChannelStore } from '@/stores/notificationChannels'
import { useSmtpSettingStore } from '@/stores/smtpSettings'
import { ChannelFormDialog } from './ChannelFormDialog'
import { ChannelList } from './ChannelList'
import { SmtpConfigDialog } from './SmtpConfigDialog'

export default function NotificationChannels() {
  const {
    channels,
    loading,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
  } = useNotificationChannelStore()
  const { setting: smtpSetting, fetchSmtpSetting, updateSmtpSetting } = useSmtpSettingStore()
  const { confirm } = useConfirm()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null)
  const [smtpDialogOpen, setSmtpDialogOpen] = useState(false)
  const [smtpSaving, setSmtpSaving] = useState(false)

  const smtpConfigured = smtpSetting?.configured ?? false

  useEffect(() => {
    fetchChannels()
    fetchSmtpSetting()
  }, [fetchChannels, fetchSmtpSetting])

  const handleSubmit = async (payload: CreateChannelInput, editing: NotificationChannel | null) => {
    if (editing) {
      await updateChannel(editing.id, payload)
      toast.success('通知渠道已更新')
    }
    else {
      await createChannel(payload)
      toast.success('通知渠道已创建')
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

  const handleSaveSmtp = async (data: UpdateSmtpSettingInput) => {
    setSmtpSaving(true)
    try {
      await updateSmtpSetting(data)
    }
    finally {
      setSmtpSaving(false)
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">通知渠道列表</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setSmtpDialogOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            SMTP 配置
          </Button>
          <Button onClick={() => {
            setEditingChannel(null)
            setDialogOpen(true)
          }}
          >
            <Plus className="h-4 w-4 mr-2" />
            添加渠道
          </Button>
        </div>
      </div>

      <ChannelList
        channels={channels}
        loading={loading}
        onEdit={(channel) => {
          setEditingChannel(channel)
          setDialogOpen(true)
        }}
        onDelete={handleDelete}
      />

      <ChannelFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingChannel={editingChannel}
        smtpConfigured={smtpConfigured}
        onSubmit={handleSubmit}
      />

      <SmtpConfigDialog
        open={smtpDialogOpen}
        onOpenChange={setSmtpDialogOpen}
        smtpSetting={smtpSetting}
        saving={smtpSaving}
        onSubmit={handleSaveSmtp}
      />
    </>
  )
}
