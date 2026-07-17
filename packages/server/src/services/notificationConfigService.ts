import type { NotificationConfig } from '../models/notificationConfig.js'
import {
  deleteNotificationConfig,
  getNotificationConfig,
  getNotificationConfigsByUserId,
  NOTIFICATION_TYPES,
  upsertNotificationConfig,
} from '../models/notificationConfig.js'

export interface NotificationConfigItem {
  type: string
  enabled: boolean
  expiryDays: number | null
}

/**
 * 获取用户的通知配置列表（含未配置的默认项）
 */
export async function getUserNotificationConfigs(userId: number): Promise<NotificationConfigItem[]> {
  const configs = await getNotificationConfigsByUserId(userId)
  const configMap = new Map(configs.map(c => [c.type, c]))

  return NOTIFICATION_TYPES.map((type) => {
    const config = configMap.get(type)
    return {
      type,
      enabled: config?.enabled ?? true,
      expiryDays: config?.expiryDays ?? (type === 'expiry_reminder' ? 30 : null),
    }
  })
}

/**
 * 获取单个通知配置（不存在则返回默认值）
 */
export async function getUserNotificationConfig(userId: number, type: string): Promise<NotificationConfigItem> {
  const config = await getNotificationConfig(userId, type)
  return {
    type,
    enabled: config?.enabled ?? true,
    expiryDays: config?.expiryDays ?? (type === 'expiry_reminder' ? 30 : null),
  }
}

/**
 * 更新或创建通知配置（upsert）
 */
export async function updateUserNotificationConfig(
  userId: number,
  type: string,
  input: { enabled?: boolean, expiryDays?: number | null },
): Promise<NotificationConfig> {
  return upsertNotificationConfig(userId, type, input)
}

/**
 * 重置通知配置为默认值（删除自定义配置）
 */
export async function resetUserNotificationConfig(userId: number, type: string): Promise<boolean> {
  return deleteNotificationConfig(userId, type)
}
