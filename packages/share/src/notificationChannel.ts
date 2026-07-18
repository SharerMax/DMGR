import type { NotificationChannelType } from './notificationLog'

/** 通知渠道实体（API 响应格式） */
export interface NotificationChannel {
  id: number
  userId: number
  type: NotificationChannelType
  name: string
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** 创建通知渠道输入（API 请求体，不含 userId） */
export interface CreateNotificationChannelInput {
  type: NotificationChannelType
  name: string
  config: Record<string, unknown>
  isActive?: boolean
}

/** 更新通知渠道输入 */
export interface UpdateNotificationChannelInput {
  type?: NotificationChannelType
  name?: string
  config?: Record<string, unknown>
  isActive?: boolean
}

export type { NotificationChannelType }
