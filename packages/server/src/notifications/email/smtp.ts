/**
 * SMTP 服务器配置
 *
 * 从环境变量读取全局 SMTP 配置，供邮件渠道发送使用。
 * 环境变量：
 *   SMTP_HOST   - SMTP 服务器地址（必填）
 *   SMTP_PORT   - SMTP 端口（默认 587）
 *   SMTP_USER   - SMTP 用户名（必填）
 *   SMTP_PASS   - SMTP 密码（必填）
 *   SMTP_FROM   - 发件人地址（必填）
 *
 * 配置缺失时抛出带友好提示的错误，便于前端展示。
 */

export interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

const REQUIRED_SMTP_ENV = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const

/**
 * 检查 SMTP 环境变量是否已配置完整
 */
export function isEmailConfigured(): boolean {
  return REQUIRED_SMTP_ENV.every(key => !!process.env[key])
}

/**
 * 获取 SMTP 配置
 * @throws Error 配置缺失时抛出带可读提示的错误
 */
export function getSmtpConfig(): SmtpConfig {
  const missing = REQUIRED_SMTP_ENV.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`邮件渠道不可用：未配置 SMTP 服务器（缺少 ${missing.join('/')} 环境变量）`)
  }

  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
  if (Number.isNaN(port)) {
    throw new TypeError('邮件渠道不可用：SMTP_PORT 环境变量不是有效数字')
  }

  return {
    host: process.env.SMTP_HOST!,
    port,
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
    from: process.env.SMTP_FROM!,
  }
}
