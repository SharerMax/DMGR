/**
 * Webhook 通知发送器
 *
 * 通过 HTTP POST 向用户配置的 Webhook URL 发送 JSON payload。
 * 配置字段：url
 */

import type { NotificationSender } from '../base.js'

import { logger } from '@/utils/index.js'

interface WebhookConfig {
  url?: string
}

export class WebhookSender implements NotificationSender {
  readonly id = 'webhook'
  readonly name = 'Webhook'

  constructor(private config: WebhookConfig) {}

  async send(content: string): Promise<void> {
    const { url } = this.config
    if (!url) {
      throw new Error('Webhook URL 未配置')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Webhook 通知发送失败: ${response.status} ${errorText}`)
    }

    logger.info({ provider: 'webhook', method: 'POST', path: url }, 'Webhook notification sent')
  }
}
