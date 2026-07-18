import type { CreateProviderInput, Provider, ProviderFeatures, ProviderField, ProviderType } from 'share'
import { create } from 'zustand'
import api from '@/lib/api'

export type { CreateProviderInput, Provider, ProviderFeatures, ProviderField, ProviderType }

interface ProviderState {
  providers: Provider[]
  providerTypes: ProviderType[]
  loading: boolean
  error: string | null
  fetchProviders: () => Promise<void>
  fetchProviderTypes: () => Promise<void>
  createProvider: (data: CreateProviderInput) => Promise<Provider>
  updateProvider: (id: number, data: Partial<CreateProviderInput>) => Promise<Provider>
  deleteProvider: (id: number) => Promise<{ deletedDomainCount: number }>
  syncDomains: (id: number) => Promise<{ syncedCount: number, domains: any[], dnsRecordsInserted: number, dnsRecordsDeleted: number }>
}

export const useProviderStore = create<ProviderState>(set => ({
  providers: [],
  providerTypes: [],
  loading: false,
  error: null,

  fetchProviders: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.get('/providers')
      set({ providers: response.data, loading: false })
    }
    catch (error: any) {
      set({ error: error.message || '获取服务商列表失败', loading: false })
    }
  },

  fetchProviderTypes: async () => {
    try {
      const response = await api.get('/providers/types')
      set({ providerTypes: response.data })
    }
    catch (error: any) {
      console.error('获取服务商类型失败:', error)
    }
  },

  createProvider: async (data) => {
    const response = await api.post('/providers', data)
    const newProvider = response.data
    set(state => ({ providers: [...state.providers, newProvider] }))
    return newProvider
  },

  updateProvider: async (id, data) => {
    const response = await api.put(`/providers/${id}`, data)
    const updatedProvider = response.data
    set(state => ({
      providers: state.providers.map(p => (p.id === id ? updatedProvider : p)),
    }))
    return updatedProvider
  },

  deleteProvider: async (id) => {
    const response = await api.delete(`/providers/${id}`)
    set(state => ({
      providers: state.providers.filter(p => p.id !== id),
    }))
    return response.data as { deletedDomainCount: number }
  },

  syncDomains: async (id) => {
    const response = await api.post(`/providers/${id}/sync`)
    return response.data
  },
}))
