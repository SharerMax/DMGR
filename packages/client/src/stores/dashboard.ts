import type { DashboardData, DashboardStats, ExpiringDomain, RecentNotification, RecentRenewal } from 'share'
import { create } from 'zustand'
import api from '@/lib/api'

export type { DashboardData, DashboardStats, ExpiringDomain, RecentNotification, RecentRenewal }

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
