import type { DateRange } from 'react-day-picker'
import type {
  NotificationChannelType,
  NotificationLog,
  NotificationType,
  PaginatedResponse,
  NotificationLogFilters as SharedNotificationLogFilters,
} from 'share'
import { create } from 'zustand'
import api from '@/lib/api'

export type { NotificationChannelType, NotificationLog, NotificationType }
export type NotificationLogsResponse = PaginatedResponse<NotificationLog>

/** 前端过滤器（在共享类型基础上增加分页参数） */
export interface NotificationLogFilters extends SharedNotificationLogFilters {
  page?: number
  pageSize?: number
}

interface NotificationLogState {
  logs: NotificationLog[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  filters: NotificationLogFilters
  dateRange: DateRange | undefined
  fetchLogs: () => Promise<void>
  getLog: (id: number) => Promise<NotificationLog>
  setFilters: (filters: Partial<NotificationLogFilters>) => void
  setDateRange: (range: DateRange | undefined) => void
  clearFilters: () => void
}

const DEFAULT_FILTERS: NotificationLogFilters = {
  page: 1,
  pageSize: 10,
}

export const useNotificationLogStore = create<NotificationLogState>((set, get) => ({
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

      if (filters.type)
        params.append('type', filters.type)
      if (filters.channel)
        params.append('channel', filters.channel)
      if (filters.domainId)
        params.append('domainId', filters.domainId.toString())
      if (filters.startDate)
        params.append('startDate', filters.startDate)
      if (filters.endDate)
        params.append('endDate', filters.endDate)
      if (filters.page)
        params.append('page', filters.page.toString())
      if (filters.pageSize)
        params.append('pageSize', filters.pageSize.toString())

      const response = await api.get<NotificationLogsResponse>(`/notification-logs?${params.toString()}`)
      set({
        logs: response.data.data,
        pagination: response.data.pagination,
        loading: false,
      })
    }
    catch (error: unknown) {
      const message = error instanceof Error ? error.message : '获取通知日志失败'
      set({ error: message, loading: false })
    }
  },

  getLog: async (id) => {
    const response = await api.get<NotificationLog>(`/notification-logs/${id}`)
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
