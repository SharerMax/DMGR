/** SMTP 服务器配置（API 响应格式，password 已脱敏） */
export interface SmtpSetting {
  host: string
  port: number
  user: string
  /** 脱敏密码：已配置时返回 "****"，未配置返回空字符串 */
  pass: string
  from: string
  /** SMTP 是否已完整配置（host/user/pass/from 均有值） */
  configured: boolean
}

/** 更新 SMTP 配置输入（pass 为空或 "****" 时不更新密码） */
export interface UpdateSmtpSettingInput {
  host?: string
  port?: number
  user?: string
  pass?: string
  from?: string
}
