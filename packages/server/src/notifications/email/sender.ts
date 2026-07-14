/**
 * 邮件通知发送器
 *
 * 通过 nodemailer 使用全局 SMTP 配置发送邮件。
 * 收件人地址来自渠道配置（config.email），SMTP 服务器配置来自环境变量。
 * 根据通知类型自定义邮件主题。
 */

import type { NotificationSender, NotificationType } from '../base.js'

import nodemailer from 'nodemailer'

import { logger } from '@/utils/index.js'
import { getSmtpConfig } from './smtp.js'

interface EmailConfig {
  email?: string
}

/**
 * 根据通知类型返回邮件主题
 */
function getSubjectByType(type: NotificationType): string {
  switch (type) {
    case 'expiry_reminder':
      return '域名过期提醒'
    case 'renewal_success':
      return '域名续期成功'
    case 'renewal_failed':
      return '域名续期失败'
    case 'sync_completed':
      return '域名同步完成'
    default:
      return '域名管理通知'
  }
}

export class EmailSender implements NotificationSender {
  readonly id = 'email'
  readonly name = '邮件'

  constructor(private config: EmailConfig) {}

  async send(content: string, type: NotificationType): Promise<void> {
    const { email } = this.config
    if (!email) {
      throw new Error('邮件地址未配置')
    }

    const smtp = getSmtpConfig()
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      auth: { user: smtp.user, pass: smtp.pass },
    })

    await transport.sendMail({
      from: smtp.from,
      to: email,
      subject: getSubjectByType(type),
      text: content,
    })

    logger.info({ provider: 'email', method: 'sendMail', to: email, type }, 'Email notification sent')
  }
}
