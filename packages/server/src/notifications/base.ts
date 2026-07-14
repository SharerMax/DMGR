/**
 * 通知渠道抽象基类与工厂
 *
 * 定义通知发送器的接口规范，并提供工厂统一创建各渠道实例。
 * 新增渠道时：在子目录实现 sender → 在 index.ts 注册。
 */

/**
 * 通知渠道字段配置
 */
export interface NotificationChannelField {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  required: boolean
  placeholder?: string
  description?: string
}

/**
 * 通知渠道元数据
 */
export interface NotificationChannelConfig {
  id: string
  name: string
  description?: string
  fields: NotificationChannelField[]
}

/**
 * 通知类型
 * 供通知渠道自定义内容呈现（如邮件主题、消息前缀、payload 结构等）
 */
export type NotificationType
  = | 'expiry_reminder' // 域名即将过期提醒
    | 'renewal_success' // 续期成功
    | 'renewal_failed' // 续期失败
    | 'sync_completed' // 同步完成

/**
 * 通知发送器抽象接口
 * 每个具体渠道（telegram / feishu 等）实现此接口
 */
export interface NotificationSender {
  /** 渠道标识 */
  readonly id: string
  /** 渠道名称 */
  readonly name: string
  /**
   * 发送通知
   * @param content 通知文本内容
   * @param type 通知类型，供渠道自定义内容呈现
   */
  send: (content: string, type: NotificationType) => Promise<void>
}

/**
 * 通知发送器工厂
 * 根据渠道类型创建对应的发送器实例
 */
export class NotificationSenderFactory {
  private static senders: Map<string, new (config: Record<string, unknown>) => NotificationSender> = new Map()

  /**
   * 注册通知发送器
   */
  static registerSender(id: string, sender: new (config: Record<string, unknown>) => NotificationSender): void {
    this.senders.set(id, sender)
  }

  /**
   * 创建通知发送器实例
   */
  static createSender(id: string, config: Record<string, unknown>): NotificationSender | null {
    const Sender = this.senders.get(id)
    if (!Sender) {
      return null
    }
    return new Sender(config)
  }

  /**
   * 获取所有已注册的渠道 ID
   */
  static getRegisteredSenders(): string[] {
    return Array.from(this.senders.keys())
  }
}
