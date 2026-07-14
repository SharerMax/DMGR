/**
 * 通知渠道模块
 *
 * 提供通知发送器的抽象接口、内置渠道配置与工厂。
 * 新增渠道时：在子目录实现 sender → 在此注册。
 */

import { NotificationSenderFactory } from './base.js'
import { EmailSender } from './email/index.js'
import { FeishuSender } from './feishu/index.js'
import { TelegramSender } from './telegram/index.js'
import { WebhookSender } from './webhook/index.js'

// 注册内置通知渠道发送器
NotificationSenderFactory.registerSender('email', EmailSender)
NotificationSenderFactory.registerSender('feishu', FeishuSender)
NotificationSenderFactory.registerSender('telegram', TelegramSender)
NotificationSenderFactory.registerSender('webhook', WebhookSender)

// 基础抽象 & 配置 & 工厂
export * from './base.js'

export * from './config.js'

// 邮件
export * from './email/index.js'

// 飞书
export * from './feishu/index.js'

// Telegram
export * from './telegram/index.js'

// Webhook
export * from './webhook/index.js'
