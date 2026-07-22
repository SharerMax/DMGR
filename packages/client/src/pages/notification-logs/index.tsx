import type { DateRange } from 'react-day-picker'
import type { Domain } from '@/stores/domains'
import type { NotificationLog, NotificationLogFilters } from '@/stores/notificationLogs'
import { format } from 'date-fns'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { useDomainStore } from '@/stores/domains'
import { useNotificationLogStore } from '@/stores/notificationLogs'
import { useProviderStore } from '@/stores/providers'
import { NotificationLogDetailDialog } from './NotificationLogDetailDialog'
import { NotificationLogFilter } from './NotificationLogFilter'
import { NotificationLogTable } from './NotificationLogTable'

export default function NotificationLogs() {
  const { domains, fetchDomains } = useDomainStore()
  const { providers, fetchProviders } = useProviderStore()
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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchDomains, setSearchDomains] = useState<Domain[]>([])

  useEffect(() => {
    if (token) {
      fetchDomains()
      fetchProviders()
    }
  }, [token, fetchDomains, fetchProviders])

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

  const handleFilterChange = (key: keyof NotificationLogFilters, value: string | number | undefined) => {
    setFilters({ [key]: value, page: 1 } as Partial<NotificationLogFilters>)
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
  }

  const handleDomainSearch = useCallback(async () => {
    const currentQuery = searchQuery.trim()
    setSearchLoading(true)
    try {
      if (!currentQuery) {
        await fetchDomains()
      }
      else {
        await fetchDomains({ search: currentQuery })
      }
      const updatedDomains = useDomainStore.getState().domains
      setSearchDomains(updatedDomains.slice(0, 15))
    }
    finally {
      setSearchLoading(false)
    }
  }, [searchQuery, fetchDomains])

  useEffect(() => {
    const timer = setTimeout(handleDomainSearch, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const selectedDomain = domains.find(d => d.id === filters.domainId)

  const domainsToGroup = searchDomains.length > 0 ? searchDomains : domains.slice(0, 15)
  const groupedDomains = useMemo(() => {
    return domainsToGroup.reduce((acc, domain) => {
      const providerId = domain.providerId ?? 'none'
      if (!acc[providerId]) {
        acc[providerId] = []
      }
      acc[providerId].push(domain)
      return acc
    }, {} as Record<string | number, Domain[]>)
  }, [domainsToGroup])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">通知记录</h1>
      </div>

      <NotificationLogFilter
        filters={filters}
        providers={providers}
        selectedDomain={selectedDomain}
        searchQuery={searchQuery}
        searchLoading={searchLoading}
        groupedDomains={groupedDomains}
        dateRange={dateRange}
        onFilterChange={handleFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onSearchQueryChange={setSearchQuery}
        onClearFilters={clearFilters}
      />

      <NotificationLogTable
        logs={logs}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        onViewDetail={setDetailLog}
      />

      <NotificationLogDetailDialog
        log={detailLog}
        onOpenChange={open => !open && setDetailLog(null)}
      />
    </div>
  )
}
