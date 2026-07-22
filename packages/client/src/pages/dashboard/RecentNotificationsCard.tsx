import type { RecentNotification } from '@/stores/dashboard'
import { format, parseISO } from 'date-fns'
import { Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'

const TYPE_COLORS: Record<string, string> = {
  expiry_reminder: 'bg-status-warning',
  renewal_success: 'bg-status-success',
  renewal_failed: 'bg-status-error',
  sync_completed: 'bg-status-info',
}

interface RecentNotificationsCardProps {
  notifications: RecentNotification[]
  onViewAll: () => void
}

export function RecentNotificationsCard({ notifications, onViewAll }: RecentNotificationsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          最近通知
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          查看全部
        </Button>
      </CardHeader>
      <CardContent>
        {notifications.length === 0
          ? (
              <p className="text-muted-foreground text-center py-8">暂无通知记录</p>
            )
          : (
              <ScrollArea className="h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>类型</TableHead>
                      <TableHead>内容</TableHead>
                      <TableHead className="text-right">时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map(notification => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <Badge className={TYPE_COLORS[notification.type] || 'bg-status-info'}>
                            {NOTIFICATION_TYPE_LABELS[notification.type] || notification.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="truncate max-w-xs">
                          {notification.domainName ? `${notification.domainName}: ` : ''}
                          {notification.content}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {notification.sentAt ? format(parseISO(notification.sentAt), 'MM-dd HH:mm') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
      </CardContent>
    </Card>
  )
}
