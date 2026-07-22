import type { NotificationChannel } from '@/stores/notificationChannels'
import { Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const channelTypeConfig = {
  email: { label: '邮件', color: 'bg-blue-100 text-blue-700' },
  webhook: { label: 'Webhook', color: 'bg-purple-100 text-purple-700' },
  telegram: { label: 'Telegram', color: 'bg-cyan-100 text-cyan-700' },
  feishu: { label: '飞书', color: 'bg-orange-100 text-orange-700' },
}

interface ChannelListProps {
  channels: NotificationChannel[]
  loading: boolean
  onEdit: (channel: NotificationChannel) => void
  onDelete: (id: number) => void
}

export function ChannelList({ channels, loading, onEdit, onDelete }: ChannelListProps) {
  return (
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
                            onClick={() => onEdit(channel)}
                            title="编辑"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-status-danger"
                            onClick={() => onDelete(channel.id)}
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
  )
}
