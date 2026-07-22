import type { NotificationLog } from '@/stores/notificationLogs'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'

const CHANNEL_LABELS: Record<string, string> = {
  email: '邮件',
  telegram: 'Telegram',
  feishu: '飞书',
  webhook: 'Webhook',
}

interface NotificationLogDetailDialogProps {
  log: NotificationLog | null
  onOpenChange: (open: boolean) => void
}

export function NotificationLogDetailDialog({ log, onOpenChange }: NotificationLogDetailDialogProps) {
  return (
    <Dialog open={!!log} onOpenChange={open => !open && onOpenChange(false)}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>通知详情</DialogTitle>
          <DialogDescription>
            {log && (NOTIFICATION_TYPE_LABELS[log.type] || log.type)}
            {' · '}
            {log && (CHANNEL_LABELS[log.channel] || log.channel)}
            {' · '}
            {log && format(new Date(log.sentAt), 'yyyy-MM-dd HH:mm:ss')}
          </DialogDescription>
        </DialogHeader>

        {log && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <span className="text-muted-foreground">类型：</span>
                <Badge variant="secondary" className="ml-1">
                  {NOTIFICATION_TYPE_LABELS[log.type] || log.type}
                </Badge>
              </div>
              <div className="flex items-center">
                <span className="text-muted-foreground">渠道：</span>
                <Badge variant="outline" className="ml-1">
                  {CHANNEL_LABELS[log.channel] || log.channel}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">域名：</span>
                <span>{log.domain?.name || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">发送时间：</span>
                <span>{format(new Date(log.sentAt), 'yyyy-MM-dd HH:mm:ss')}</span>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">通知内容</h4>
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap wrap-break-word">
                {log.content}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
