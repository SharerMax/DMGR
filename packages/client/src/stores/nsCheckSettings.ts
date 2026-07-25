import type { NsCheckSetting, NsCheckTestInput, NsCheckTestResult, UpdateNsCheckSettingInput } from 'share'
import { create } from 'zustand'
import api from '@/lib/api'

export type { NsCheckSetting, NsCheckTestInput, NsCheckTestResult, UpdateNsCheckSettingInput }

interface NsCheckSettingState {
  setting: NsCheckSetting | null
  loading: boolean
  fetchNsCheckSetting: () => Promise<NsCheckSetting>
  updateNsCheckSetting: (data: UpdateNsCheckSettingInput) => Promise<NsCheckSetting>
  testNsCheck: (data: NsCheckTestInput) => Promise<NsCheckTestResult>
}

export const useNsCheckSettingStore = create<NsCheckSettingState>(set => ({
  setting: null,
  loading: false,

  fetchNsCheckSetting: async () => {
    set({ loading: true })
    try {
      const response = await api.get('/ns-check-settings')
      const setting = response.data as NsCheckSetting
      set({ setting, loading: false })
      return setting
    }
    catch (error: any) {
      set({ loading: false })
      throw error
    }
  },

  updateNsCheckSetting: async (data) => {
    const response = await api.put('/ns-check-settings', data)
    const setting = response.data as NsCheckSetting
    set({ setting })
    return setting
  },

  testNsCheck: async (data) => {
    const response = await api.post('/ns-check-settings/check', data)
    return response.data as NsCheckTestResult
  },
}))
