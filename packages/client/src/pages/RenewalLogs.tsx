import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { getRenewalLogs, getRenewalLogStats, type RenewalLog, type RenewalLogFilters } from '@/api/renewalLogs'
import { useDomainStore } from '@/stores/domains'
import { useAuthStore } from '@/stores/auth'

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

  const [logs, setLogs] = useState<RenewalLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{
    total: number
    completed: number
    failed: number
    pending: number
    skipped: number
    successRate: number
  } | null>(null)

  const [filters, setFilters] = useState<RenewalLogFilters>({
    page: 1,
    pageSize: 10,
  })

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  })

  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({
    start: null,
    end: null,
  })

  useEffect(() => {
    if (token) {
      useDomainStore.getState().fetchDomains()
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [filters])

  useEffect(() => {
    if (token) {
      fetchStats()
    }
  }, [token])

  const fetchData = async () => {
    if (!token) return

    setLoading(true)
    try {
      const queryFilters: RenewalLogFilters = {
        ...filters,
        startDate: dateRange.start ? format(dateRange.start, 'yyyy-MM-dd') : undefined,
        endDate: dateRange.end ? format(dateRange.end, 'yyyy-MM-dd') : undefined,
      }

      const response = await getRenewalLogs(queryFilters)
      setLogs(response.data)
      setPagination(response.pagination)
    }
    catch (error) {
      console.error('Failed to fetch renewal logs:', error)
    }
    finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await getRenewalLogStats()
      setStats(response.summary)
    }
    catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }))
  }

  const handleFilterChange = (key: keyof RenewalLogFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end })
    setFilters(prev => ({
      ...prev,
      startDate: start ? format(start, 'yyyy-MM-dd') : undefined,
      endDate: end ? format(end, 'yyyy-MM-dd') : undefined,
      page: 1,
    }))
  }

  const clearFilters = () => {
    setFilters({ page: 1, pageSize: 10 })
    setDateRange({ start: null, end: null })
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
              <div className="text-2xl font-bold">{stats.successRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="搜索域名..."
              value={filters.domainName || ''}
              onChange={(e) => handleFilterChange('domainName', e.target.value || undefined)}
            />
            <Select
              value={filters.domainId?.toString() || 'all'}
              onValueChange={(value) => handleFilterChange('domainId', value === 'all' ? undefined : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择域名" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部域名</SelectItem>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id.toString()}>
                    {domain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}
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
              startDate={dateRange.start}
              endDate={dateRange.end}
              onStartDateChange={(date) => handleDateRangeChange(date, dateRange.end)}
              onEndDateChange={(date) => handleDateRangeChange(dateRange.start, date)}
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
          {loading ? (
            <div className="text-center py-8">加载中...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无续期日志</div>
          ) : (
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
                  {logs.map((log) => (
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
              <Pagination
                itemsPerPage={pagination.pageSize}
                totalItems={pagination.total}
                currentPage={pagination.page}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
