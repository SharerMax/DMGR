/**
 * 通知服务
 * 处理域名相关的通知发送
 */

import { prisma } from '../db/index.js'
import { logger } from '../utils/index.js'

export type NotificationType
  = | 'expiry_reminder' // 域名即将过期提醒
    | 'renewal_success' // 续期成功
    | 'renewal_failed' // 续期失败
    | 'sync_completed' // 同步完成

interface NotificationData {
  domainName: string
  daysUntilExpiry?: number
  error?: string
  syncedCount?: number
}

/**
 * 发送通知
 */
export async function sendNotification(
  userId: number,
  domainId: number,
  type: NotificationType,
  data: NotificationData,
): Promise<void> {
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
      await sendViaChannel(channel, content)
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
 */
async function sendViaChannel(
  channel: { id: number, type: string, name: string, config: string },
  content: string,
): Promise<void> {
  const config = JSON.parse(channel.config)

  switch (channel.type) {
    case 'email':
      await sendEmail(config, content)
      break
    case 'webhook':
      await sendWebhook(config, content)
      break
    case 'sms':
      await sendSMS(config, content)
      break
    default:
      logger.warn({ channelType: channel.type }, 'Unknown notification channel type')
  }
}

/**
 * 发送邮件通知
 */
async function sendEmail(config: Record<string, any>, _content: string): Promise<void> {
  // 实际实现需要接入邮件服务
  // 例如：使用 nodemailer、SendGrid、阿里云邮件推送等
  logger.info({ email: config.email || config.to }, 'Email notification sent')
}

/**
 * 发送 Webhook 通知
 */
async function sendWebhook(config: Record<string, any>, content: string): Promise<void> {
  // 实际实现需要发送 HTTP 请求
  const url = config.url
  if (!url) {
    throw new Error('Webhook URL 未配置')
  }

  const _payload = {
    content,
    timestamp: new Date().toISOString(),
  }

  // 示例：使用 fetch 发送 POST 请求
  // await fetch(url, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(_payload),
  // })

  logger.info({ url }, 'Webhook notification sent')
}

/**
 * 发送短信通知
 */
async function sendSMS(config: Record<string, any>, _content: string): Promise<void> {
  // 实际实现需要接入短信服务
  // 例如：使用阿里云短信、腾讯云短信等
  logger.info({ phone: config.phone }, 'SMS notification sent')
}

/**
 * 检查域名过期并发送提醒
 */
export async function checkExpiringDomains(): Promise<void> {
  const now = new Date()

  // 查询需要提醒的域名
  const domains = await prisma.domain.findMany({
    where: {
      status: 'active',
      expiryDate: { gt: now },
    },
    include: {
      user: true,
      reminders: true,
    },
  })

  for (const domain of domains) {
    const daysUntilExpiry = Math.ceil(
      (domain.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )

    // 检查是否需要提醒
    const shouldRemind = domain.reminders.some(
      r => r.daysBefore >= daysUntilExpiry && !r.notified,
    )

    if (shouldRemind) {
      await sendNotification(domain.userId, domain.id, 'expiry_reminder', {
        domainName: domain.name,
        daysUntilExpiry,
      })

      // 更新提醒状态
      await prisma.reminder.updateMany({
        where: {
          domainId: domain.id,
          daysBefore: { gte: daysUntilExpiry },
          notified: false,
        },
        data: {
          notified: true,
          notifyDate: now,
        },
      })
    }
  }
}
