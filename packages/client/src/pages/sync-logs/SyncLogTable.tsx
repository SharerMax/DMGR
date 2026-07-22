import type { SyncLog } from '@/stores/syncLogs'
import { format } from 'date-fns'
import { CircleEllipsis } from 'lucide-react'
import { DataTablePagination } from '@/components/DataTablePagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-status-success',
  failed: 'bg-status-error',
  partial: 'bg-status-warning',
}

const STATUS_LABELS: Record<string, string> = {
  success: '成功',
  failed: '失败',
  partial: '部分成功',
}

interface SyncLogTableProps {
  logs: SyncLog[]
  loading: boolean
  pagination: { page: number, pageSize: number, total: number, totalPages: number }
  onPageChange: (page: number) => void
  onItemsPerPageChange: (size: number) => void
  onViewDetail: (log: SyncLog) => void
}

export function SyncLogTable({
  logs,
  loading,
  pagination,
  onPageChange,
  onItemsPerPageChange,
  onViewDetail,
}: SyncLogTableProps) {
  return (
    <Card>
      <CardContent>
        {loading
          ? <div className="text-center py-8">加载中...</div>
          : logs.length === 0
            ? <div className="text-center py-8 text-muted-foreground">暂无同步记录</div>
            : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>服务商</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>新增域名</TableHead>
                        <TableHead>新增DNS</TableHead>
                        <TableHead>删除DNS</TableHead>
                        <TableHead>错误信息</TableHead>
                        <TableHead>时间</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">{log.provider?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`${STATUS_COLORS[log.status] || 'bg-muted-foreground'} text-white`}
                            >
                              {STATUS_LABELS[log.status] || log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.domainsSynced}</TableCell>
                          <TableCell>{log.dnsInserted}</TableCell>
                          <TableCell>{log.dnsDeleted}</TableCell>
                          <TableCell className="text-status-error max-w-48 truncate">{log.error || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                          </TableCell>
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
