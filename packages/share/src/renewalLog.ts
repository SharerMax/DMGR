/** 续期日志状态 */
export type RenewalLogStatus
  = | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'skipped'

/** 续期日志实体（API 响应格式） */
export interface RenewalLog {
  id: number
  domainId: number
  status: RenewalLogStatus
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

/** 续期日志筛选条件（查询参数，不含分页） */
export interface RenewalLogFilters {
  domainId?: number
  domainName?: string
  providerId?: number
  status?: string
  startDate?: string
  endDate?: string
}

/** 续期统计摘要 */
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

/** 自动续期配置 */
export interface AutoRenewConfig {
  enabled: boolean
  triggerMode: 'manual' | 'scheduled'
  cronExpression: string
}
