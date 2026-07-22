import type { DateRange } from 'react-day-picker'
import type { RenewalLogFilters } from '@/stores/renewalLogs'
import { format } from 'date-fns'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useDomainStore } from '@/stores/domains'
import { useRenewalLogStore } from '@/stores/renewalLogs'
import { RenewalLogFilter } from './RenewalLogFilter'
import { RenewalLogTable } from './RenewalLogTable'

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

  // 从域名列表中提取唯一服务商
  const providers = [...new Map(domains.map(d => [d.providerId, d.provider_name])).entries()]
    .filter(([id]) => id)
    .map(([id, name]) => ({ id: id!.toString(), name: name || '未知' }))

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

  const handleFilterChange = (key: keyof RenewalLogFilters, value: string | number | undefined) => {
    setFilters({ [key]: value, page: 1 } as Partial<RenewalLogFilters>)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">续期日志</h1>
      </div>

      <RenewalLogFilter
        filters={filters}
        providers={providers}
        dateRange={dateRange}
        onFilterChange={handleFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onClearFilters={clearFilters}
      />

      <RenewalLogTable
        logs={logs}
        loading={loading}
        pagination={pagination}
        stats={stats}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  )
}
