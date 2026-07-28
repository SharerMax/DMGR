import type { CreateChannelInput, NotificationChannel } from '@/stores/notificationChannels'
import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { useConfirm } from '@/hooks/useConfirm'
import { useNotificationChannelStore } from '@/stores/notificationChannels'
import { useSmtpSettingStore } from '@/stores/smtpSettings'
import { ChannelFormDialog } from './ChannelFormDialog'
import { ChannelList } from './ChannelList'

export default function NotificationChannels() {
  const {
    channels,
    loading,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
  } = useNotificationChannelStore()
  const { setting: smtpSetting, fetchSmtpSetting } = useSmtpSettingStore()
  const { confirm } = useConfirm()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null)

  const smtpConfigured = smtpSetting?.configured ?? false

  useEffect(() => {
    fetchChannels()
    fetchSmtpSetting()
  }, [fetchChannels, fetchSmtpSetting])

  const handleSubmit = async (payload: CreateChannelInput, editing: NotificationChannel | null) => {
    if (editing) {
      await updateChannel(editing.id, payload)
      toast.add({ title: '通知渠道已更新', type: 'success' })
    }
    else {
      await createChannel(payload)
      toast.add({ title: '通知渠道已创建', type: 'success' })
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
      toast.add({ title: '通知渠道已删除', type: 'success' })
    }
    catch (error: any) {
      toast.add({ title: error.message || '删除失败', type: 'error' })
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">通知渠道列表</h2>
        <Button onClick={() => {
          setEditingChannel(null)
          setDialogOpen(true)
        }}
        >
          <Plus className="h-4 w-4 mr-2" />
          添加渠道
        </Button>
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
    </>
  )
}
