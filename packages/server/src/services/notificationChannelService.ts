import type { CreateNotificationChannelInput, NotificationChannel, UpdateNotificationChannelInput } from '../models/notificationChannel.js'
import {
  createNotificationChannel,

  deleteNotificationChannel,
  getNotificationChannelById,
  getNotificationChannelsByUserId,

  parseConfig,
  updateNotificationChannel,

} from '../models/notificationChannel.js'
import { isEmailConfigured } from '../notifications/index.js'

export interface NotificationChannelWithConfig extends Omit<NotificationChannel, 'config'> {
  config: Record<string, unknown>
}

function withParsedConfig(channel: NotificationChannel): NotificationChannelWithConfig {
  return {
    ...channel,
    config: parseConfig(channel.config),
  }
}

/**
 * 邮件渠道：SMTP 未配置时强制禁用（不阻止创建）
 */
function maybeDisableEmailChannel(input: {
  type: string
  isActive?: boolean
}): boolean | undefined {
  if (input.type === 'email' && !isEmailConfigured()) {
    return false
  }
  return input.isActive
}

export async function getUserChannels(userId: number): Promise<NotificationChannelWithConfig[]> {
  const channels = await getNotificationChannelsByUserId(userId)
  return channels.map(withParsedConfig)
}

export async function getUserChannel(userId: number, channelId: number): Promise<NotificationChannelWithConfig | null> {
  const channel = await getNotificationChannelById(channelId)
  if (!channel || channel.userId !== userId) {
    return null
  }
  return withParsedConfig(channel)
}

export async function createUserChannel(
  userId: number,
  input: Omit<CreateNotificationChannelInput, 'userId'>,
): Promise<NotificationChannelWithConfig> {
  const isActive = maybeDisableEmailChannel(input)
  const channel = await createNotificationChannel({ ...input, userId, isActive })
  return withParsedConfig(channel)
}

export async function updateUserChannel(
  userId: number,
  channelId: number,
  input: UpdateNotificationChannelInput,
): Promise<NotificationChannelWithConfig | null> {
  const channel = await getNotificationChannelById(channelId)
  if (!channel || channel.userId !== userId) {
    return null
  }
  // 邮件渠道：SMTP 未配置时禁止启用
  const effectiveType = input.type ?? channel.type
  if (effectiveType === 'email' && !isEmailConfigured() && input.isActive === true) {
    input.isActive = false
  }
  const updated = await updateNotificationChannel(channelId, input)
  if (!updated) {
    return null
  }
  return withParsedConfig(updated)
}

export async function deleteUserChannel(userId: number, channelId: number): Promise<boolean> {
  const channel = await getNotificationChannelById(channelId)
  if (!channel || channel.userId !== userId) {
    return false
  }
  return deleteNotificationChannel(channelId)
}
