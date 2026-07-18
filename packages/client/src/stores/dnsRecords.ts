import type { CreateDNSRecordInput, DNSRecord } from 'share'
import { create } from 'zustand'
import api from '@/lib/api'

export type { CreateDNSRecordInput, DNSRecord }

interface DNSRecordState {
  records: DNSRecord[]
  loading: boolean
  error: string | null
  fetchRecords: (domainId: number) => Promise<void>
  createRecord: (data: CreateDNSRecordInput) => Promise<DNSRecord>
  updateRecord: (id: number, data: Partial<CreateDNSRecordInput>) => Promise<DNSRecord>
  deleteRecord: (id: number) => Promise<void>
}

export const useDNSRecordStore = create<DNSRecordState>(set => ({
  records: [],
  loading: false,
  error: null,

  fetchRecords: async (domainId) => {
    set({ loading: true, error: null })
    try {
      const response = await api.get(`/dns-records/domain/${domainId}`)
      set({ records: response.data, loading: false })
    }
    catch (error: any) {
      set({ error: error.response?.data?.error || '获取DNS记录失败', loading: false })
    }
  },

  createRecord: async (data) => {
    const response = await api.post('/dns-records', data)
    const newRecord = response.data
    set(state => ({ records: [...state.records, newRecord] }))
    return newRecord
  },

  updateRecord: async (id, data) => {
    const response = await api.put(`/dns-records/${id}`, data)
    const updatedRecord = response.data
    set(state => ({
      records: state.records.map(r => (r.id === id ? updatedRecord : r)),
    }))
    return updatedRecord
  },

  deleteRecord: async (id) => {
    await api.delete(`/dns-records/${id}`)
    set(state => ({
      records: state.records.filter(r => r.id !== id),
    }))
  },
}))
