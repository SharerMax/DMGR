import { create } from 'zustand'
import api from '@/lib/api'

export interface Domain {
  id: number
  name: string
  providerId: number | null
  provider_name?: string | null
  userId: number
  expiryDate: string
  autoRenew: boolean
  autoRenewDays: number | null // 自动续期触发阈值
  renewalPrice: number | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  reminders?: Reminder[]
}

export interface Reminder {
  id: number
  domainId: number
  daysBefore: number
  notified: boolean
  notifyDate: string | null
  createdAt: string
}

interface DomainState {
  domains: Domain[]
  loading: boolean
  error: string | null
  fetchDomains: (filters?: DomainFilters) => Promise<void>
  createDomain: (data: CreateDomainInput) => Promise<Domain>
  updateDomain: (id: number, data: Partial<CreateDomainInput>) => Promise<Domain>
  deleteDomain: (id: number) => Promise<void>
  addReminder: (domainId: number, daysBefore: number) => Promise<Reminder>
}

export interface DomainFilters {
  search?: string
  providerId?: number | 'all'
}

export interface CreateDomainInput {
  name: string
  providerId?: number | null
  expiryDate: string
  autoRenew?: boolean
  autoRenewDays?: number | null
  renewalPrice?: number | null
  notes?: string | null
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

  addReminder: async (domainId, daysBefore) => {
    const response = await api.post(`/domains/${domainId}/reminders`, {
      daysBefore,
    })
    const reminder = response.data
    set(state => ({
      domains: state.domains.map(d =>
        d.id === domainId ? { ...d, reminders: [...(d.reminders || []), reminder] } : d,
      ),
    }))
    return reminder
  },
}))
