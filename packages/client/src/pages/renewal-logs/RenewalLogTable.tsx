import type { RenewalLog } from '@/stores/renewalLogs'
import { format } from 'date-fns'
import { DataTablePagination } from '@/components/DataTablePagination'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RENEWAL_STATUS_COLORS, RENEWAL_STATUS_LABELS } from '@/lib/constants'

interface RenewalStats {
  total: number
  completed: number
  failed: number
  pending: number
  skipped: number
  successRate: number
}

interface RenewalLogTableProps {
  logs: RenewalLog[]
  loading: boolean
  pagination: { page: number, pageSize: number, total: number, totalPages: number }
  stats: RenewalStats | null
  onPageChange: (page: number) => void
  onItemsPerPageChange: (size: number) => void
}

export function RenewalLogTable({
  logs,
  loading,
  pagination,
  stats,
  onPageChange,
  onItemsPerPageChange,
}: RenewalLogTableProps) {
  return (
    <>
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">总计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">成功</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-success">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">失败</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-error">{stats.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">已跳过</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-disabled">{stats.skipped}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">成功率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.successRate}
                %
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent>
          {loading
            ? <div className="text-center py-8">加载中...</div>
            : logs.length === 0
              ? <div className="text-center py-8 text-muted-foreground">暂无续期日志</div>
              : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>域名</TableHead>
                          <TableHead>服务商</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>消息</TableHead>
                          <TableHead>错误信息</TableHead>
                          <TableHead>创建时间</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map(log => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.domain?.name || '-'}</TableCell>
                            <TableCell>{log.domain?.provider?.name || '-'}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={`${RENEWAL_STATUS_COLORS[log.status] || 'bg-muted-foreground'} text-white`}
                              >
                                {RENEWAL_STATUS_LABELS[log.status] || log.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.message || '-'}</TableCell>
                            <TableCell className="text-status-error">{log.error || '-'}</TableCell>
                            <TableCell>
                              {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
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
    </>
  )
}
