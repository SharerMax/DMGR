import type { NotificationChannel } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { NotificationChannel }

export interface CreateNotificationChannelInput {
  userId: number
  type: string
  name: string
  config: Record<string, unknown>
  defaultDays?: number
  isActive?: boolean
}

export interface UpdateNotificationChannelInput {
  type?: string
  name?: string
  config?: Record<string, unknown>
  defaultDays?: number
  isActive?: boolean
}

export async function createNotificationChannel(input: CreateNotificationChannelInput): Promise<NotificationChannel> {
  return prisma.notificationChannel.create({
    data: {
      userId: input.userId,
      type: input.type,
      name: input.name,
      config: JSON.stringify(input.config),
      defaultDays: input.defaultDays ?? 90,
      isActive: input.isActive ?? true,
    },
  })
}

export async function getNotificationChannelById(id: number): Promise<NotificationChannel | null> {
  return prisma.notificationChannel.findUnique({
    where: { id },
  })
}

export async function getNotificationChannelsByUserId(userId: number): Promise<NotificationChannel[]> {
  return prisma.notificationChannel.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateNotificationChannel(
  id: number,
  input: UpdateNotificationChannelInput,
): Promise<NotificationChannel | null> {
  const data: Record<string, unknown> = {}
  if (input.type !== undefined)
    data.type = input.type
  if (input.name !== undefined)
    data.name = input.name
  if (input.config !== undefined)
    data.config = JSON.stringify(input.config)
  if (input.defaultDays !== undefined)
    data.defaultDays = input.defaultDays
  if (input.isActive !== undefined)
    data.isActive = input.isActive

  return prisma.notificationChannel.update({
    where: { id },
    data,
  })
}

export async function deleteNotificationChannel(id: number): Promise<boolean> {
  try {
    await prisma.notificationChannel.delete({
      where: { id },
    })
    return true
  }
  catch {
    return false
  }
}

export function parseConfig(configString: string): Record<string, unknown> {
  try {
    return JSON.parse(configString)
  }
  catch {
    return {}
  }
}
