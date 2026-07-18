/** 仪表盘统计数据 */
export interface DashboardStats {
  totalDomains: number
  totalProviders: number
  expiringDomains: number
  activeDomains: number
}

/** 最近通知 */
export interface RecentNotification {
  id: number
  type: string
  content: string
  channel: string
  sentAt: string
  domainName?: string | null
}

/** 最近续期记录 */
export interface RecentRenewal {
  id: number
  status: string
  message: string | null
  domainName: string
  createdAt: string
}

/** 即将过期域名 */
export interface ExpiringDomain {
  id: number
  name: string
  expiryDate: string | null
  daysUntilExpiry: number
  providerName?: string | null
}

/** 仪表盘完整数据 */
export interface DashboardData {
  stats: DashboardStats
  recentNotifications: RecentNotification[]
  recentRenewals: RecentRenewal[]
  expiringDomains: ExpiringDomain[]
}
