/** 通知类型 */
export type NotificationType
  = | 'expiry_reminder'
    | 'renewal_success'
    | 'renewal_failed'
    | 'sync_completed'

/** 通知渠道类型 */
export type NotificationChannelType = 'email' | 'telegram' | 'feishu' | 'webhook'

/** 通知日志实体（API 响应格式） */
export interface NotificationLog {
  id: number
  userId: number
  domainId?: number | null
  domain?: { id: number, name: string } | null
  type: NotificationType
  content: string
  channel: NotificationChannelType
  sentAt: string
}

/** 通知日志筛选条件（查询参数，不含分页） */
export interface NotificationLogFilters {
  type?: string
  channel?: string
  domainId?: number
  startDate?: string
  endDate?: string
}
