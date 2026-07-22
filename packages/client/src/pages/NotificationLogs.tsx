import type { DateRange } from 'react-day-picker'
import type { NotificationLog } from '@/stores/notificationLogs'
import { format } from 'date-fns'
import { CircleEllipsis } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DataTablePagination } from '@/components/DataTablePagination'
import { DateRangePicker } from '@/components/DatePicker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthStore } from '@/stores/auth'
import { useDomainStore } from '@/stores/domains'
import { useNotificationLogStore } from '@/stores/notificationLogs'

const TYPE_LABELS: Record<string, string> = {
  expiry_reminder: '过期提醒',
  renewal_success: '续期成功',
  renewal_failed: '续期失败',
  sync_completed: '同步完成',
}

const CHANNEL_LABELS: Record<string, string> = {
  email: '邮件',
  telegram: 'Telegram',
  feishu: '飞书',
  webhook: 'Webhook',
}

export default function NotificationLogs() {
  const { domains } = useDomainStore()
  const { token } = useAuthStore()
  const {
    logs,
    loading,
    pagination,
    filters,
    dateRange,
    fetchLogs,
    setFilters,
    setDateRange,
    clearFilters,
  } = useNotificationLogStore()

  const [detailLog, setDetailLog] = useState<NotificationLog | null>(null)

  useEffect(() => {
    if (token) {
      useDomainStore.getState().fetchDomains()
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchLogs()
    }
  }, [token, filters, fetchLogs])

  useEffect(() => {
    if (token) {
      setFilters({
        startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        page: 1,
      })
    }
  }, [dateRange, setFilters, token])

  const handlePageChange = (newPage: number) => {
    setFilters({ page: newPage })
  }

  const handleItemsPerPageChange = (size: number) => {
    setFilters({ pageSize: size, page: 1 })
  }

  const handleFilterChange = (key: keyof typeof filters, value: string | number | undefined) => {
    setFilters({ [key]: value, page: 1 } as Partial<typeof filters>)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">通知记录</h1>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filters.type || 'all'}
              onValueChange={value => handleFilterChange('type', value === 'all' ? undefined : value ?? undefined)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="expiry_reminder">过期提醒</SelectItem>
                <SelectItem value="renewal_success">续期成功</SelectItem>
                <SelectItem value="renewal_failed">续期失败</SelectItem>
                <SelectItem value="sync_completed">同步完成</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.channel || 'all'}
              onValueChange={value => handleFilterChange('channel', value === 'all' ? undefined : value ?? undefined)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="选择渠道" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部渠道</SelectItem>
                <SelectItem value="email">邮件</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="feishu">飞书</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.domainId?.toString() || 'all'}
              onValueChange={value => handleFilterChange('domainId', value === 'all' ? undefined : Number(value))}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="选择域名" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部域名</SelectItem>
                {domains.map(domain => (
                  <SelectItem key={domain.id} value={domain.id.toString()}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              className="w-64"
            />
            <Button variant="outline" onClick={clearFilters}>
              清除筛选
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
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
                                {TYPE_LABELS[log.type] || log.type}
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
                                onClick={() => setDetailLog(log)}
                              >
                                <CircleEllipsis className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* 分页 */}
                    <DataTablePagination
                      itemsPerPage={pagination.pageSize}
                      totalItems={pagination.total}
                      currentPage={pagination.page}
                      onPageChange={handlePageChange}
                      onItemsPerPageChange={handleItemsPerPageChange}
                    />
                  </>
                )}
        </CardContent>
      </Card>

      {/* 详情对话框 */}
      <Dialog open={!!detailLog} onOpenChange={open => !open && setDetailLog(null)}>
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>通知详情</DialogTitle>
            <DialogDescription>
              {detailLog && (TYPE_LABELS[detailLog.type] || detailLog.type)}
              {' · '}
              {detailLog && (CHANNEL_LABELS[detailLog.channel] || detailLog.channel)}
              {' · '}
              {detailLog && format(new Date(detailLog.sentAt), 'yyyy-MM-dd HH:mm:ss')}
            </DialogDescription>
          </DialogHeader>

          {detailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <span className="text-muted-foreground">类型：</span>
                  <Badge variant="secondary" className="ml-1">
                    {TYPE_LABELS[detailLog.type] || detailLog.type}
                  </Badge>
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground">渠道：</span>
                  <Badge variant="outline" className="ml-1">
                    {CHANNEL_LABELS[detailLog.channel] || detailLog.channel}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">域名：</span>
                  <span>{detailLog.domain?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">发送时间：</span>
                  <span>{format(new Date(detailLog.sentAt), 'yyyy-MM-dd HH:mm:ss')}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">通知内容</h4>
                <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap wrap-break-word">
                  {detailLog.content}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
