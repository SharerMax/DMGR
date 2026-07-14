/**
 * 内置通知渠道配置列表
 *
 * 此文件维护所有支持的通知渠道元数据。
 * 添加新的通知渠道时，只需在此文件添加配置，并在对应子目录实现 sender。
 */

import type { NotificationChannelConfig } from './base.js'

export const BUILT_IN_NOTIFICATION_CHANNELS: NotificationChannelConfig[] = [
  {
    id: 'email',
    name: '邮件',
    description: '通过 SMTP 发送邮件通知',
    fields: [
      {
        key: 'email',
        label: '邮箱地址',
        type: 'text',
        required: true,
        placeholder: 'example@email.com',
        description: '接收通知的邮箱地址',
      },
    ],
  },
  {
    id: 'feishu',
    name: '飞书',
    description: '飞书机器人通知',
    fields: [
      {
        key: 'webhookUrl',
        label: 'Webhook URL',
        type: 'url',
        required: true,
        placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
        description: '飞书机器人 Webhook 地址',
      },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Telegram Bot 通知',
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        type: 'password',
        required: true,
        placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        description: 'Telegram Bot Token',
      },
      {
        key: 'chatId',
        label: 'Chat ID',
        type: 'text',
        required: true,
        placeholder: '123456789',
        description: '接收通知的 Chat ID',
      },
    ],
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: '通过 HTTP POST 发送 Webhook 通知',
    fields: [
      {
        key: 'url',
        label: 'Webhook URL',
        type: 'url',
        required: true,
        placeholder: 'https://example.com/webhook',
        description: '接收通知的 Webhook 地址',
      },
    ],
  },
]

/**
 * 根据 ID 获取通知渠道配置
 */
export function getChannelConfig(id: string): NotificationChannelConfig | undefined {
  return BUILT_IN_NOTIFICATION_CHANNELS.find(c => c.id === id)
}

/**
 * 获取所有支持的通知渠道列表
 */
export function getAllChannelConfigs(): NotificationChannelConfig[] {
  return [...BUILT_IN_NOTIFICATION_CHANNELS]
}
