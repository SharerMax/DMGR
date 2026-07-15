import type { DateRange } from 'react-day-picker'
import { create } from 'zustand'
import api from '@/lib/api'

export type NotificationType = 'expiry_reminder' | 'renewal_success' | 'renewal_failed' | 'sync_completed'
export type NotificationChannel = 'email' | 'telegram' | 'feishu' | 'webhook'

export interface NotificationLogDomain {
  id: number
  name: string
}

export interface NotificationLog {
  id: number
  userId: number
  domainId?: number | null
  domain?: NotificationLogDomain | null
  type: NotificationType
  content: string
  channel: NotificationChannel
  sentAt: string
}

export interface NotificationLogsResponse {
  data: NotificationLog[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface NotificationLogFilters {
  type?: string
  channel?: string
  domainId?: number
  startDate?: string
  endDate?: string
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
