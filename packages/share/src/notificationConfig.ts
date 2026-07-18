import type { NotificationType } from './notificationLog'

/** 通知配置类型（同 NotificationType，用于配置页） */
export type NotificationConfigType = NotificationType

/** 通知配置实体（API 响应格式） */
export interface NotificationConfig {
  type: NotificationConfigType
  enabled: boolean
  expiryDays: number | null
}

/** 更新通知配置输入 */
export interface UpdateNotificationConfigInput {
  enabled?: boolean
  expiryDays?: number | null
}

export type { NotificationType }
