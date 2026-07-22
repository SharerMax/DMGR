import type { DateRange } from 'react-day-picker'
import type { SyncLog, SyncLogFilters } from '@/stores/syncLogs'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useProviderStore } from '@/stores/providers'
import { useSyncLogStore } from '@/stores/syncLogs'
import { SyncLogDetailDialog } from './SyncLogDetailDialog'
import { SyncLogFilter } from './SyncLogFilter'
import { SyncLogTable } from './SyncLogTable'

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

  const handleFilterChange = (key: keyof SyncLogFilters, value: string | number | undefined) => {
    setFilters({ [key]: value, page: 1 } as Partial<SyncLogFilters>)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">同步记录</h1>
      </div>

      <SyncLogFilter
        filters={filters}
        providers={providers}
        dateRange={dateRange}
        onFilterChange={handleFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onClearFilters={clearFilters}
      />

      <SyncLogTable
        logs={logs}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        onViewDetail={setDetailLog}
      />

      <SyncLogDetailDialog
        log={detailLog}
        onOpenChange={open => !open && setDetailLog(null)}
      />
    </div>
  )
}
