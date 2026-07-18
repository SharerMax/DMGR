import type { DateRange } from 'react-day-picker'
import type {
  DNSChangeDetail,
  DomainChange,
  PaginatedResponse,
  SyncLogFilters as SharedSyncLogFilters,
  SyncDetails,
  SyncLog,
} from 'share'
import { create } from 'zustand'
import api from '@/lib/api'

export type { DNSChangeDetail, DomainChange, SyncDetails, SyncLog }
export type SyncLogsResponse = PaginatedResponse<SyncLog>

/** 前端过滤器（在共享类型基础上增加分页参数） */
export interface SyncLogFilters extends SharedSyncLogFilters {
  page?: number
  pageSize?: number
}

interface SyncLogState {
  logs: SyncLog[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  filters: SyncLogFilters
  dateRange: DateRange | undefined
  fetchLogs: () => Promise<void>
  getLog: (id: number) => Promise<SyncLog>
  setFilters: (filters: Partial<SyncLogFilters>) => void
  setDateRange: (range: DateRange | undefined) => void
  clearFilters: () => void
}

const DEFAULT_FILTERS: SyncLogFilters = {
  page: 1,
  pageSize: 10,
}

export const useSyncLogStore = create<SyncLogState>((set, get) => ({
  logs: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },
  filters: { ...DEFAULT_FILTERS },
  dateRange: undefined,

  fetchLogs: async () => {
    set({ loading: true, error: null })
    try {
      const { filters } = get()
      const params = new URLSearchParams()

      if (filters.providerId)
        params.append('providerId', filters.providerId.toString())
      if (filters.status)
        params.append('status', filters.status)
      if (filters.startDate)
        params.append('startDate', filters.startDate)
      if (filters.endDate)
        params.append('endDate', filters.endDate)
      if (filters.page)
        params.append('page', filters.page.toString())
      if (filters.pageSize)
        params.append('pageSize', filters.pageSize.toString())

      const response = await api.get<SyncLogsResponse>(`/sync-logs?${params.toString()}`)
      set({
        logs: response.data.data,
        pagination: response.data.pagination,
        loading: false,
      })
    }
    catch (error: any) {
      set({ error: error.message || '获取同步日志失败', loading: false })
    }
  },

  getLog: async (id) => {
    const response = await api.get<SyncLog>(`/sync-logs/${id}`)
    return response.data
  },

  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
    }))
  },

  setDateRange: (range) => {
    set({ dateRange: range })
  },

  clearFilters: () => {
    set({
      filters: { ...DEFAULT_FILTERS },
      dateRange: undefined,
    })
  },
}))
