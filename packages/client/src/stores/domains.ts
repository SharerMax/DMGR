import type { CreateDomainInput, Domain } from 'share'
import { create } from 'zustand'
import api from '@/lib/api'

export type { CreateDomainInput, Domain }

/** 前端过滤器（providerId 支持 'all' 哨兵值用于 UI） */
export interface DomainFilters {
  search?: string
  providerId?: number | 'all'
}

interface DomainState {
  domains: Domain[]
  loading: boolean
  error: string | null
  fetchDomains: (filters?: DomainFilters) => Promise<void>
  createDomain: (data: CreateDomainInput) => Promise<Domain>
  updateDomain: (id: number, data: Partial<CreateDomainInput>) => Promise<Domain>
  deleteDomain: (id: number) => Promise<void>
}

export const useDomainStore = create<DomainState>(set => ({
  domains: [],
  loading: false,
  error: null,

  fetchDomains: async (filters?: DomainFilters) => {
    set({ loading: true, error: null })
    try {
      // 构建查询参数
      const params = new URLSearchParams()
      if (filters?.search) {
        params.append('search', filters.search)
      }
      if (filters?.providerId && filters.providerId !== 'all') {
        params.append('providerId', filters.providerId.toString())
      }

      const queryString = params.toString()
      const url = queryString ? `/domains?${queryString}` : '/domains'
      const response = await api.get(url)
      set({ domains: response.data, loading: false })
    }
    catch (error: any) {
      set({ error: error.message || '获取域名列表失败', loading: false })
    }
  },

  createDomain: async (data) => {
    const response = await api.post('/domains', data)
    const newDomain = response.data
    set(state => ({ domains: [...state.domains, newDomain] }))
    return newDomain
  },

  updateDomain: async (id, data) => {
    const response = await api.put(`/domains/${id}`, data)
    const updatedDomain = response.data
    set(state => ({
      domains: state.domains.map(d => (d.id === id ? updatedDomain : d)),
    }))
    return updatedDomain
  },

  deleteDomain: async (id) => {
    await api.delete(`/domains/${id}`)
    set(state => ({
      domains: state.domains.filter(d => d.id !== id),
    }))
  },
}))
