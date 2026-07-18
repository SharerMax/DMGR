import { create } from 'zustand'
import api from '@/lib/api'

export interface DashboardStats {
  totalDomains: number
  totalProviders: number
  expiringDomains: number
  activeDomains: number
}

export interface RecentNotification {
  id: number
  type: string
  content: string
  channel: string
  sentAt: string
  domainName?: string | null
}

export interface RecentRenewal {
  id: number
  status: string
  message: string | null
  domainName: string
  createdAt: string
}

export interface ExpiringDomain {
  id: number
  name: string
  expiryDate: string | null
  daysUntilExpiry: number
  providerName?: string | null
}

export interface DashboardData {
  stats: DashboardStats
  recentNotifications: RecentNotification[]
  recentRenewals: RecentRenewal[]
  expiringDomains: ExpiringDomain[]
}

interface DashboardState {
  data: DashboardData | null
  loading: boolean
  error: string | null
  fetchData: () => Promise<void>
}

export const useDashboardStore = create<DashboardState>(set => ({
  data: null,
  loading: false,
  error: null,

  fetchData: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.get<DashboardData>('/dashboard')
      set({
        data: response.data,
        loading: false,
      })
    }
    catch (error: unknown) {
      const message = error instanceof Error ? error.message : '获取概览数据失败'
      set({ error: message, loading: false })
    }
  },
}))
