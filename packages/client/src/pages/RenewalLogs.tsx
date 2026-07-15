import type { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { useEffect } from 'react'
import { DataTablePagination } from '@/components/DataTablePagination'
import { DateRangePicker } from '@/components/DatePicker'
import { DomainFilter } from '@/components/DomainFilter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuthStore } from '@/stores/auth'
import { useDomainStore } from '@/stores/domains'
import { useRenewalLogStore } from '@/stores/renewalLogs'

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  pending: 'bg-yellow-500',
  skipped: 'bg-gray-500',
  processing: 'bg-blue-500',
}

const STATUS_LABELS: Record<string, string> = {
  completed: '成功',
  failed: '失败',
  pending: '处理中',
  skipped: '已跳过',
  processing: '处理中',
}

export default function RenewalLogs() {
  const { domains } = useDomainStore()
  const { token } = useAuthStore()
  const {
    logs,
    stats,
    loading,
    pagination,
    filters,
    dateRange,
    fetchLogs,
    fetchStats,
    setFilters,
    setDateRange,
    clearFilters,
  } = useRenewalLogStore()

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
      fetchStats()
    }
  }, [token, fetchStats])

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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">续期日志</h1>
      </div>

      {/* 统计卡片 */}
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
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">失败</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">已跳过</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.skipped}</div>
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

      {/* 筛选器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* 域名过滤 - 使用统一组件 */}
            <DomainFilter
              domains={domains}
              search={filters.domainName || ''}
              providerId={filters.providerId?.toString() || 'all'}
              onSearchChange={value => handleFilterChange('domainName', value || undefined)}
              onProviderChange={value => handleFilterChange('providerId', value === 'all' ? undefined : Number(value))}
              showProviderFilter={true}
            />
            {/* 状态和日期筛选 */}
            <div className="flex flex-wrap gap-4">
              <Select
                value={filters.status || 'all'}
                onValueChange={value => handleFilterChange('status', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="completed">成功</SelectItem>
                  <SelectItem value="failed">失败</SelectItem>
                  <SelectItem value="pending">处理中</SelectItem>
                  <SelectItem value="skipped">已跳过</SelectItem>
                </SelectContent>
              </Select>
              <DateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
              />
              <Button variant="outline" onClick={clearFilters}>
                清除筛选
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardContent className="pt-6">
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
                                className={`${STATUS_COLORS[log.status] || 'bg-gray-500'} text-white`}
                              >
                                {STATUS_LABELS[log.status] || log.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{log.message || '-'}</TableCell>
                            <TableCell className="text-red-600">{log.error || '-'}</TableCell>
                            <TableCell>
                              {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss')}
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
    </div>
  )
}
