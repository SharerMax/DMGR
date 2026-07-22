/**
 * SMTP 服务器配置
 *
 * 环境变量（SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM）作为默认值，
 * 服务层可通过 setSmtpOverride() 注入数据库中的配置（优先级高于环境变量）。
 * 这样 smtp.ts 本身不访问数据库，保持通知适配层的分层约束。
 */

export interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

const REQUIRED_FIELDS: (keyof SmtpConfig)[] = ['host', 'user', 'pass', 'from']

/** 服务层注入的 DB 配置覆盖（优先于环境变量） */
let smtpOverride: SmtpConfig | null = null

/**
 * 由服务层调用：注入从数据库读取的合并配置
 * 传入 null 表示清除覆盖，回退到环境变量
 */
export function setSmtpOverride(config: SmtpConfig | null): void {
  smtpOverride = config
}

/**
 * 获取当前生效的 SMTP 配置（override 优先，环境变量兜底）
 * @throws Error 配置缺失时抛出带可读提示的错误
 */
export function getSmtpConfig(): SmtpConfig {
  if (smtpOverride) {
    return smtpOverride
  }

  const missing = REQUIRED_FIELDS.filter(key => !process.env[`SMTP_${key.toUpperCase()}`])
  if (missing.length > 0) {
    const envKeys = missing.map(k => `SMTP_${k.toUpperCase()}`)
    throw new Error(`邮件渠道不可用：未配置 SMTP 服务器（缺少 ${envKeys.join('/')} 环境变量）`)
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

/**
 * 检查 SMTP 是否已完整配置（override 优先，环境变量兜底）
 */
export function isEmailConfigured(): boolean {
  if (smtpOverride) {
    return REQUIRED_FIELDS.every(field => !!smtpOverride![field])
  }
  return REQUIRED_FIELDS.every(
    field => !!process.env[`SMTP_${field.toUpperCase()}`],
  )
}

/**
 * 获取当前生效的 SMTP 配置（不抛错，用于 API 响应）
 * override 优先，环境变量兜底，缺失字段返回空值
 */
export function getEffectiveSmtpConfig(): {
  host: string
  port: number
  user: string
  pass: string
  from: string
} {
  if (smtpOverride) {
    return { ...smtpOverride }
  }
  return {
    host: process.env.SMTP_HOST || '',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
  }
}
