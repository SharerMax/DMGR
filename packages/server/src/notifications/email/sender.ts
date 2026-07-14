/**
 * 邮件通知发送器
 *
 * 通过 nodemailer 使用全局 SMTP 配置发送邮件。
 * 收件人地址来自渠道配置（config.email），SMTP 服务器配置来自环境变量。
 */

import type { NotificationSender } from '../base.js'

import nodemailer from 'nodemailer'

import { logger } from '@/utils/index.js'
import { getSmtpConfig } from './smtp.js'

interface EmailConfig {
  email?: string
}

export class EmailSender implements NotificationSender {
  readonly id = 'email'
  readonly name = '邮件'

  constructor(private config: EmailConfig) {}

  async send(content: string): Promise<void> {
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
      subject: '域名管理通知',
      text: content,
    })

    logger.info({ provider: 'email', method: 'sendMail', to: email }, 'Email notification sent')
  }
}
