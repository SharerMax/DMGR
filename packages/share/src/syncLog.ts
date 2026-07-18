/** 同步日志状态 */
export type SyncLogStatus = 'success' | 'failed' | 'partial'

/** 同步日志域名变更详情 */
export interface DomainChange {
  name: string
}

/** 同步日志 DNS 变更详情 */
export interface DNSChangeDetail {
  domain: string
  type: string
  name: string
  value: string
}

/** 同步日志详情 */
export interface SyncDetails {
  domainsAdded: DomainChange[]
  dnsInserted: DNSChangeDetail[]
  dnsDeleted: DNSChangeDetail[]
}

/** 同步日志实体（API 响应格式） */
export interface SyncLog {
  id: number
  providerId: number
  userId: number
  status: SyncLogStatus
  domainsSynced: number
  dnsInserted: number
  dnsDeleted: number
  error: string | null
  details: string | null
  createdAt: string
  provider?: {
    id: number
    name: string
    type: string
  }
}

/** 同步日志筛选条件（查询参数，不含分页） */
export interface SyncLogFilters {
  providerId?: number
  status?: string
  startDate?: string
  endDate?: string
}
