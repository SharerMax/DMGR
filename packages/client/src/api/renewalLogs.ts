import api from '@/lib/api'

export interface RenewalLog {
  id: number
  domainId: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
  message?: string
  error?: string
  renewedAt?: string
  createdAt: string
  domain?: {
    id: number
    name: string
    userId: number
    provider?: {
      id: number
      name: string
      type: string
    }
  }
}

export interface RenewalLogStats {
  summary: {
    total: number
    completed: number
    failed: number
    pending: number
    skipped: number
    successRate: number
  }
  recentLogs: Array<{
    id: number
    domainId: number
    status: string
    message?: string
    error?: string
    createdAt: string
    domain: { name: string }
  }>
}

export interface RenewalLogsResponse {
  data: RenewalLog[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface RenewalLogFilters {
  domainId?: number
  domainName?: string
  providerId?: number
  status?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export async function getRenewalLogs(filters: RenewalLogFilters = {}): Promise<RenewalLogsResponse> {
  const params = new URLSearchParams()

  if (filters.domainId)
    params.append('domainId', filters.domainId.toString())
  if (filters.domainName)
    params.append('domainName', filters.domainName)
  if (filters.status)
    params.append('status', filters.status)
  if (filters.startDate)
    params.append('startDate', filters.startDate)
  if (filters.endDate)
    params.append('endDate', filters.endDate)
  if (filters.page)
    params.append('page', filters.page.toString())
  if (filters.pageSize)
    params.append('pageSize', filters.pageSize.toString())

  const response = await api.get<RenewalLogsResponse>(`/renewal-logs?${params.toString()}`)
  return response.data
}

export async function getRenewalLogStats(): Promise<RenewalLogStats> {
  const response = await api.get<RenewalLogStats>('/renewal-logs/stats/summary')
  return response.data
}

export async function getRenewalLog(id: number): Promise<RenewalLog> {
  const response = await api.get<RenewalLog>(`/renewal-logs/${id}`)
  return response.data
}
