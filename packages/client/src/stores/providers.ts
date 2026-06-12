import { create } from 'zustand'
import api from '@/lib/api'

export interface ProviderField {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  required: boolean
  placeholder?: string
  description?: string
}

export interface ProviderType {
  id: string
  name: string
  description?: string
  fields: ProviderField[]
  supportsAutoRenew: boolean
  features: string[]
}

export interface Provider {
  id: number
  type: string
  name: string
  config: string
  supportsAutoRenew: boolean
  userId: number
  createdAt: string
  updatedAt: string
}

interface ProviderState {
  providers: Provider[]
  providerTypes: ProviderType[]
  loading: boolean
  error: string | null
  fetchProviders: () => Promise<void>
  fetchProviderTypes: () => Promise<void>
  createProvider: (data: CreateProviderInput) => Promise<Provider>
  updateProvider: (id: number, data: Partial<CreateProviderInput>) => Promise<Provider>
  deleteProvider: (id: number) => Promise<void>
  syncDomains: (id: number) => Promise<{ syncedCount: number, domains: any[] }>
}

export interface CreateProviderInput {
  type: string
  name: string
  config: Record<string, string>
  supportsAutoRenew?: boolean
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
      set({ error: error.response?.data?.error || '获取服务商列表失败', loading: false })
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
    await api.delete(`/providers/${id}`)
    set(state => ({
      providers: state.providers.filter(p => p.id !== id),
    }))
  },

  syncDomains: async (id) => {
    const response = await api.post(`/providers/${id}/sync`)
    return response.data
  },
}))
