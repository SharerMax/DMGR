import type { DateRange } from 'react-day-picker'
import { create } from 'zustand'
import api from '@/lib/api'

export interface RenewalLog {
  id: number
  domainId: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  message?: string
  error?: string
  renewedAt?: string
  createdAt: string
  domain?: {
    id: number
    name: string
    userId: number
    provider?: {
      id: number
      name: string
      type: string
    }
  }
}

export interface RenewalLogStats {
  summary: {
    total: number
    completed: number
    failed: number
    pending: number
    skipped: number
    successRate: number
  }
  recentLogs: Array<{
    id: number
    domainId: number
    status: string
    message?: string
    error?: string
    createdAt: string
    domain: { name: string }
  }>
}

export interface RenewalLogsResponse {
  data: RenewalLog[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface RenewalLogFilters {
  domainId?: number
  domainName?: string
  providerId?: number
  status?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

interface RenewalLogState {
  logs: RenewalLog[]
  stats: {
    total: number
    completed: number
    failed: number
    pending: number
    skipped: number
    successRate: number
  } | null
  loading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  filters: RenewalLogFilters
  dateRange: DateRange | undefined
  fetchLogs: () => Promise<void>
  fetchStats: () => Promise<void>
  getLog: (id: number) => Promise<RenewalLog>
  setFilters: (filters: Partial<RenewalLogFilters>) => void
  setDateRange: (range: DateRange | undefined) => void
  clearFilters: () => void
}

const DEFAULT_FILTERS: RenewalLogFilters = {
  page: 1,
  pageSize: 10,
}

export const useRenewalLogStore = create<RenewalLogState>((set, get) => ({
  logs: [],
  stats: null,
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

      if (filters.domainId)
        params.append('domainId', filters.domainId.toString())
      if (filters.domainName)
        params.append('domainName', filters.domainName)
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

      const response = await api.get<RenewalLogsResponse>(`/renewal-logs?${params.toString()}`)
      set({
        logs: response.data.data,
        pagination: response.data.pagination,
        loading: false,
      })
    }
    catch (error: any) {
      set({ error: error.message || '获取续期日志失败', loading: false })
    }
  },

  fetchStats: async () => {
    try {
      const response = await api.get<RenewalLogStats>('/renewal-logs/stats/summary')
      set({ stats: response.data.summary })
    }
    catch (error: any) {
      console.error('获取续期统计失败:', error)
    }
  },

  getLog: async (id) => {
    const response = await api.get<RenewalLog>(`/renewal-logs/${id}`)
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
