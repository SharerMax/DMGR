/**
 * Telegram 通知发送器
 *
 * 通过 Telegram Bot API sendMessage 发送通知。
 * 配置字段：botToken、chatId
 */

import type { NotificationSender, NotificationType } from '../base.js'

import { logger } from '@/utils/index.js'

interface TelegramConfig {
  botToken?: string
  chatId?: string
}

export class TelegramSender implements NotificationSender {
  readonly id = 'telegram'
  readonly name = 'Telegram'

  constructor(private config: TelegramConfig) {}

  async send(content: string, type: NotificationType): Promise<void> {
    const { botToken, chatId } = this.config
    if (!botToken || !chatId) {
      throw new Error('Telegram botToken 或 chatId 未配置')
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: content, parse_mode: 'HTML' }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Telegram 通知发送失败: ${response.status} ${errorText}`)
    }

    logger.info({ provider: 'telegram', method: 'sendMessage', chatId, type }, 'Telegram notification sent')
  }
}
