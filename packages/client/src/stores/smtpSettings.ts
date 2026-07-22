import type { SmtpSetting, UpdateSmtpSettingInput } from 'share'
import { create } from 'zustand'
import api from '@/lib/api'

export type { SmtpSetting, UpdateSmtpSettingInput }

interface SmtpSettingState {
  setting: SmtpSetting | null
  loading: boolean
  fetchSmtpSetting: () => Promise<SmtpSetting>
  updateSmtpSetting: (data: UpdateSmtpSettingInput) => Promise<SmtpSetting>
}

export const useSmtpSettingStore = create<SmtpSettingState>(set => ({
  setting: null,
  loading: false,

  fetchSmtpSetting: async () => {
    set({ loading: true })
    try {
      const response = await api.get('/smtp-settings')
      const setting = response.data as SmtpSetting
      set({ setting, loading: false })
      return setting
    }
    catch (error: any) {
      set({ loading: false })
      throw error
    }
  },

  updateSmtpSetting: async (data) => {
    const response = await api.put('/smtp-settings', data)
    const setting = response.data as SmtpSetting
    set({ setting })
    return setting
  },
}))
