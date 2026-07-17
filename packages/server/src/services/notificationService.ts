/**
 * 通知服务
 * 处理域名相关的通知发送
 */

import type { NotificationType } from '../notifications/index.js'
import { prisma } from '../db/index.js'
import { NotificationSenderFactory } from '../notifications/index.js'
import { logger } from '../utils/index.js'
import { getUserNotificationConfig } from './notificationConfigService.js'

interface NotificationData {
  domainName: string
  daysUntilExpiry?: number
  error?: string
  syncedCount?: number
}

/**
 * 发送通知
 * 发送前检查用户的通知配置开关，关闭的类型不发送
 */
export async function sendNotification(
  userId: number,
  domainId: number,
  type: NotificationType,
  data: NotificationData,
): Promise<void> {
  // 检查用户是否启用了该通知类型
  const config = await getUserNotificationConfig(userId, type)
  if (!config.enabled) {
    logger.info({ userId, type }, 'Notification skipped: disabled by user config')
    return
  }

  // 获取用户的通知渠道
  const channels = await prisma.notificationChannel.findMany({
    where: {
      userId,
      isActive: true,
    },
  })

  if (channels.length === 0) {
    logger.warn({ userId }, 'User has no notification channels configured')
    return
  }

  // 构建通知内容
  const content = buildNotificationContent(type, data)

  // 通过各渠道发送
  for (const channel of channels) {
    try {
      await sendViaChannel(channel, content, type)
    }
    catch (error) {
      logger.error({ error, channelType: channel.type }, 'Notification send failed')
    }
  }

  // 记录通知日志
  await prisma.notificationLog.create({
    data: {
      userId,
      domainId,
      type,
      content,
      channel: channels.map(c => c.type).join(','),
    },
  })
}

/**
 * 构建通知内容
 */
function buildNotificationContent(type: NotificationType, data: NotificationData): string {
  switch (type) {
    case 'expiry_reminder':
      return `域名 ${data.domainName} 将在 ${data.daysUntilExpiry} 天后过期，请及时续期。`

    case 'renewal_success':
      return `域名 ${data.domainName} 自动续期成功！`

    case 'renewal_failed':
      return `域名 ${data.domainName} 自动续期失败：${data.error || '未知错误'}`

    case 'sync_completed':
      return `域名同步完成，新增 ${data.syncedCount || 0} 个域名。`

    default:
      return `域名 ${data.domainName} 有新的状态更新。`
  }
}

/**
 * 通过指定渠道发送通知
 * 具体发送逻辑由 notifications/<渠道>/sender 实现，统一通过工厂创建实例
 */
async function sendViaChannel(
  channel: { id: number, type: string, name: string, config: string },
  content: string,
  type: NotificationType,
): Promise<void> {
  const config = JSON.parse(channel.config)
  const sender = NotificationSenderFactory.createSender(channel.type, config)
  if (!sender) {
    logger.warn({ channelType: channel.type }, 'Unknown notification channel type')
    return
  }
  await sender.send(content, type)
}

/**
 * 检查域名过期并发送提醒
 * 使用用户通知配置中的 expiryDays 作为提醒阈值
 */
export async function checkExpiringDomains(): Promise<void> {
  const now = new Date()

  // 查询即将过期的域名（90天内）
  const domains = await prisma.domain.findMany({
    where: {
      status: 'active',
      expiryDate: { gt: now },
    },
    include: {
      user: true,
    },
  })

  // 按用户分组，避免重复查询配置
  const userConfigCache = new Map<number, { enabled: boolean, expiryDays: number }>()

  for (const domain of domains) {
    if (!domain.expiryDate) {
      continue
    }

    const daysUntilExpiry = Math.ceil(
      (domain.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )

    // 获取用户的通知配置（带缓存）
    if (!userConfigCache.has(domain.userId)) {
      const config = await getUserNotificationConfig(domain.userId, 'expiry_reminder')
      userConfigCache.set(domain.userId, {
        enabled: config.enabled,
        expiryDays: config.expiryDays ?? 30,
      })
    }
    const userConfig = userConfigCache.get(domain.userId)!

    if (!userConfig.enabled) {
      continue
    }

    // 检查是否在提醒窗口内
    if (daysUntilExpiry <= userConfig.expiryDays) {
      await sendNotification(domain.userId, domain.id, 'expiry_reminder', {
        domainName: domain.name,
        daysUntilExpiry,
      })
    }
  }
}
