/**
 * 邮件通知渠道模块
 */

export { EmailSender } from './sender.js'
export { getSmtpConfig, isEmailConfigured } from './smtp.js'
export type { SmtpConfig } from './smtp.js'
