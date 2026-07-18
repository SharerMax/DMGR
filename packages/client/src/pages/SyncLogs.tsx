import type { DateRange } from 'react-day-picker'
import type { SyncDetails, SyncLog } from '@/stores/syncLogs'
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
import { useProviderStore } from '@/stores/providers'
import { useSyncLogStore } from '@/stores/syncLogs'

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

function parseDetails(details: string | null): SyncDetails | null {
  if (!details) {
    return null
  }
  try {
    return JSON.parse(details) as SyncDetails
  }
  catch {
    return null
  }
}

export default function SyncLogs() {
  const { providers } = useProviderStore()
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
  } = useSyncLogStore()

  const [detailLog, setDetailLog] = useState<SyncLog | null>(null)

  useEffect(() => {
    if (token) {
      useProviderStore.getState().fetchProviders()
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

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters({ [key]: value, page: 1 })
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
  }

  const details = parseDetails(detailLog?.details ?? null)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">同步记录</h1>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={filters.providerId?.toString() || 'all'}
              onValueChange={value => handleFilterChange('providerId', value === 'all' ? undefined : Number(value))}
            >
              <SelectTrigger className="w-30">
                <SelectValue placeholder="全部服务商" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部服务商</SelectItem>
                {providers.map(provider => (
                  <SelectItem key={provider.id} value={provider.id.toString()}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status || 'all'}
              onValueChange={value => handleFilterChange('status', value === 'all' ? undefined : value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
                <SelectItem value="partial">部分成功</SelectItem>
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
            <DialogTitle>同步详情</DialogTitle>
            <DialogDescription>
              {detailLog?.provider?.name}
              {' · '}
              {detailLog && format(new Date(detailLog.createdAt), 'yyyy-MM-dd HH:mm:ss')}
            </DialogDescription>
          </DialogHeader>

          {detailLog && (
            <div className="space-y-4 -mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4">
              {/* 状态概览 */}
              <div className="flex items-center gap-4">
                <Badge
                  variant="secondary"
                  className={`${STATUS_COLORS[detailLog.status] || 'bg-gray-500'} text-white`}
                >
                  {STATUS_LABELS[detailLog.status] || detailLog.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  新增域名
                  {' '}
                  {detailLog.domainsSynced}
                  {' '}
                  · 新增 DNS
                  {' '}
                  {detailLog.dnsInserted}
                  {' '}
                  · 删除 DNS
                  {' '}
                  {detailLog.dnsDeleted}
                </span>
              </div>

              {detailLog.error && (
                <div className="rounded-md bg-status-error-bg-light p-3 text-sm text-status-error">
                  {detailLog.error}
                </div>
              )}

              {details && (
                <>
                  {/* 新增域名 */}
                  {details.domainsAdded.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-status-success">
                        新增域名（
                        {details.domainsAdded.length}
                        ）
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {details.domainsAdded.map(d => (
                          <Badge key={d.name} variant="outline" className="text-status-success">
                            {d.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 新增 DNS 记录 */}
                  {details.dnsInserted.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-status-success">
                        新增 DNS 记录（
                        {details.dnsInserted.length}
                        ）
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>域名</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead>主机名</TableHead>
                            <TableHead>值</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {details.dnsInserted.map((r, i) => (
                            <TableRow key={`ins-${i}`}>
                              <TableCell className="font-medium">{r.domain}</TableCell>
                              <TableCell>{r.type}</TableCell>
                              <TableCell>{r.name}</TableCell>
                              <TableCell className="max-w-48 truncate">{r.value}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* 删除 DNS 记录 */}
                  {details.dnsDeleted.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-status-danger">
                        删除 DNS 记录（
                        {details.dnsDeleted.length}
                        ）
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>域名</TableHead>
                            <TableHead>类型</TableHead>
                            <TableHead>主机名</TableHead>
                            <TableHead>值</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {details.dnsDeleted.map((r, i) => (
                            <TableRow key={`del-${i}`}>
                              <TableCell className="font-medium">{r.domain}</TableCell>
                              <TableCell>{r.type}</TableCell>
                              <TableCell>{r.name}</TableCell>
                              <TableCell className="max-w-48 truncate">{r.value}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* 无变更 */}
                  {details.domainsAdded.length === 0 && details.dnsInserted.length === 0 && details.dnsDeleted.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">本次同步无变更</div>
                  )}
                </>
              )}

              {!details && detailLog.status === 'success' && (
                <div className="text-center py-4 text-muted-foreground">无变更详情</div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
