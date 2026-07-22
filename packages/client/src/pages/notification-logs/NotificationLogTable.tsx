import type { NotificationLog } from '@/stores/notificationLogs'
import { format } from 'date-fns'
import { CircleEllipsis } from 'lucide-react'
import { DataTablePagination } from '@/components/DataTablePagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'

const CHANNEL_LABELS: Record<string, string> = {
  email: '邮件',
  telegram: 'Telegram',
  feishu: '飞书',
  webhook: 'Webhook',
}

interface NotificationLogTableProps {
  logs: NotificationLog[]
  loading: boolean
  pagination: { page: number, pageSize: number, total: number, totalPages: number }
  onPageChange: (page: number) => void
  onItemsPerPageChange: (size: number) => void
  onViewDetail: (log: NotificationLog) => void
}

export function NotificationLogTable({
  logs,
  loading,
  pagination,
  onPageChange,
  onItemsPerPageChange,
  onViewDetail,
}: NotificationLogTableProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        {loading
          ? <div className="text-center py-8">加载中...</div>
          : logs.length === 0
            ? <div className="text-center py-8 text-muted-foreground">暂无通知记录</div>
            : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>发送时间</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>渠道</TableHead>
                        <TableHead>域名</TableHead>
                        <TableHead>内容</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.sentAt), 'yyyy-MM-dd HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {NOTIFICATION_TYPE_LABELS[log.type] || log.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {CHANNEL_LABELS[log.channel] || log.channel}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{log.domain?.name || '-'}</TableCell>
                          <TableCell className="max-w-48 truncate">{log.content}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="查看详情"
                              onClick={() => onViewDetail(log)}
                            >
                              <CircleEllipsis className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <DataTablePagination
                    itemsPerPage={pagination.pageSize}
                    totalItems={pagination.total}
                    currentPage={pagination.page}
                    onPageChange={onPageChange}
                    onItemsPerPageChange={onItemsPerPageChange}
                  />
                </>
              )}
      </CardContent>
    </Card>
  )
}
