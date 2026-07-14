/**
 * 飞书通知发送器
 *
 * 通过飞书机器人 Webhook 发送通知。
 * 配置字段：webhookUrl
 */

import type { NotificationSender } from '../base.js'

import { logger } from '@/utils/index.js'

interface FeishuConfig {
  webhookUrl?: string
}

export class FeishuSender implements NotificationSender {
  readonly id = 'feishu'
  readonly name = '飞书'

  constructor(private config: FeishuConfig) {}

  async send(content: string): Promise<void> {
    const { webhookUrl } = this.config
    if (!webhookUrl) {
      throw new Error('飞书 webhookUrl 未配置')
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text: content },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`飞书通知发送失败: ${response.status} ${errorText}`)
    }

    logger.info({ provider: 'feishu', method: 'webhook', path: webhookUrl }, 'Feishu notification sent')
  }
}
