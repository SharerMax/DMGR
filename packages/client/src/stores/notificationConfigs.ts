import type { NotificationConfig, NotificationConfigType, UpdateNotificationConfigInput } from 'share'
import { create } from 'zustand'
import api from '@/lib/api'

export type { NotificationConfig, NotificationConfigType, UpdateNotificationConfigInput }

interface NotificationConfigState {
  configs: NotificationConfig[]
  loading: boolean
  error: string | null
  fetchConfigs: () => Promise<void>
  updateConfig: (type: NotificationConfigType, data: UpdateNotificationConfigInput) => Promise<NotificationConfig>
  resetConfig: (type: NotificationConfigType) => Promise<void>
}

export const useNotificationConfigStore = create<NotificationConfigState>(set => ({
  configs: [],
  loading: false,
  error: null,

  fetchConfigs: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.get<NotificationConfig[]>('/notification-configs')
      set({ configs: response.data, loading: false })
    }
    catch (error: unknown) {
      const message = error instanceof Error ? error.message : '获取通知配置失败'
      set({ error: message, loading: false })
    }
  },

  updateConfig: async (type, data) => {
    const response = await api.put<NotificationConfig>(`/notification-configs/${type}`, data)
    const updated = response.data
    set(state => ({
      configs: state.configs.map(c => (c.type === type ? updated : c)),
    }))
    return updated
  },

  resetConfig: async (type) => {
    await api.delete(`/notification-configs/${type}`)
    // 重置后重新拉取列表以获取默认值
    const response = await api.get<NotificationConfig[]>('/notification-configs')
    set({ configs: response.data })
  },
}))
