/**
 * 邮件通知渠道模块
 */

export { EmailSender } from './sender.js'
export { getEffectiveSmtpConfig, getSmtpConfig, isEmailConfigured, setSmtpOverride } from './smtp.js'
export type { SmtpConfig } from './smtp.js'
