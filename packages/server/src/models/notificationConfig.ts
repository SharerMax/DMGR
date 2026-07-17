import type { NotificationConfig } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { NotificationConfig }

/** 通知类型列表（与 notifications/base.ts 的 NotificationType 保持一致） */
export const NOTIFICATION_TYPES = [
  'expiry_reminder',
  'renewal_success',
  'renewal_failed',
  'sync_completed',
] as const

export interface UpdateNotificationConfigInput {
  enabled?: boolean
  expiryDays?: number | null
}

export async function getNotificationConfigsByUserId(userId: number): Promise<NotificationConfig[]> {
  return prisma.notificationConfig.findMany({
    where: { userId },
    orderBy: { type: 'asc' },
  })
}

export async function getNotificationConfig(userId: number, type: string): Promise<NotificationConfig | null> {
  return prisma.notificationConfig.findUnique({
    where: { userId_type: { userId, type } },
  })
}

export async function upsertNotificationConfig(
  userId: number,
  type: string,
  input: UpdateNotificationConfigInput,
): Promise<NotificationConfig> {
  return prisma.notificationConfig.upsert({
    where: { userId_type: { userId, type } },
    create: {
      userId,
      type,
      enabled: input.enabled ?? true,
      expiryDays: input.expiryDays ?? null,
    },
    update: {
      ...(input.enabled !== undefined && { enabled: input.enabled }),
      ...(input.expiryDays !== undefined && { expiryDays: input.expiryDays }),
    },
  })
}

export async function deleteNotificationConfig(userId: number, type: string): Promise<boolean> {
  try {
    await prisma.notificationConfig.delete({
      where: { userId_type: { userId, type } },
    })
    return true
  }
  catch {
    return false
  }
}
