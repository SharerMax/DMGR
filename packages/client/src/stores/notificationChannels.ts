import type {
  CreateNotificationChannelInput,
  NotificationChannel,
  NotificationChannelType,
  UpdateNotificationChannelInput,
} from 'share'
import { create } from 'zustand'
import api from '@/lib/api'

type CreateChannelInput = CreateNotificationChannelInput

export type {
  CreateChannelInput,
  NotificationChannel,
  NotificationChannelType,
  UpdateNotificationChannelInput,
}

interface NotificationChannelState {
  channels: NotificationChannel[]
  loading: boolean
  error: string | null
  fetchChannels: () => Promise<void>
  createChannel: (data: CreateChannelInput) => Promise<NotificationChannel>
  updateChannel: (id: number, data: Partial<CreateChannelInput>) => Promise<NotificationChannel>
  deleteChannel: (id: number) => Promise<void>
}

export const useNotificationChannelStore = create<NotificationChannelState>(set => ({
  channels: [],
  loading: false,
  error: null,

  fetchChannels: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.get('/notification-channels')
      set({ channels: response.data, loading: false })
    }
    catch (error: any) {
      set({ error: error.message || '获取通知渠道失败', loading: false })
    }
  },

  createChannel: async (data) => {
    const response = await api.post('/notification-channels', data)
    const newChannel = response.data
    set(state => ({ channels: [...state.channels, newChannel] }))
    return newChannel
  },

  updateChannel: async (id, data) => {
    const response = await api.put(`/notification-channels/${id}`, data)
    const updatedChannel = response.data
    set(state => ({
      channels: state.channels.map(c => (c.id === id ? updatedChannel : c)),
    }))
    return updatedChannel
  },

  deleteChannel: async (id) => {
    await api.delete(`/notification-channels/${id}`)
    set(state => ({
      channels: state.channels.filter(c => c.id !== id),
    }))
  },
}))
