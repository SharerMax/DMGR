/**
 * SMTP 配置服务
 *
 * 合并数据库配置（优先）与环境变量（兜底），
 * 通过 setSmtpOverride() 注入到 notifications/email/smtp.ts。
 * 这样通知适配层无需直接访问数据库，保持分层约束。
 */

import type { SmtpSetting, UpdateSmtpSettingInput } from 'share'
import { logger } from '@/utils/index.js'
import { getSmtpSetting, upsertSmtpSetting } from '../models/smtpSetting.js'
import {
  getEffectiveSmtpConfig,
  isEmailConfigured,
  setSmtpOverride,
} from '../notifications/index.js'

const PASSWORD_MASK = '****'
const REQUIRED_FIELDS = ['host', 'user', 'pass', 'from'] as const

/**
 * 从数据库读取 SMTP 配置，与环境变量合并后注入 override
 * DB 值（非 null）优先于环境变量
 */
export async function loadSmtpOverride(): Promise<void> {
  const dbSetting = await getSmtpSetting()
  if (!dbSetting) {
    setSmtpOverride(null)
    logger.info('SMTP: no DB config, using env defaults')
    return
  }

  // DB 值优先（非 null），环境变量兜底
  const merged = {
    host: dbSetting.host ?? process.env.SMTP_HOST ?? '',
    port: dbSetting.port ?? (process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587),
    user: dbSetting.user ?? process.env.SMTP_USER ?? '',
    pass: dbSetting.pass ?? process.env.SMTP_PASS ?? '',
    from: dbSetting.from ?? process.env.SMTP_FROM ?? '',
  }

  setSmtpOverride(merged)
  logger.info({ configured: isEmailConfigured() }, 'SMTP override loaded')
}

/**
 * 获取 SMTP 配置（API 响应，密码脱敏）
 */
export function getSmtpSettingForApi(): SmtpSetting {
  const config = getEffectiveSmtpConfig()
  return {
    host: config.host,
    port: config.port,
    user: config.user,
    pass: config.pass ? PASSWORD_MASK : '',
    from: config.from,
    configured: REQUIRED_FIELDS.every(field => !!config[field]),
  }
}

/**
 * 更新 SMTP 配置
 * pass 为空或 "****" 时不更新密码（保持原值）
 */
export async function updateSmtpSetting(
  input: UpdateSmtpSettingInput,
): Promise<void> {
  const dbData: {
    host?: string | null
    port?: number | null
    user?: string | null
    pass?: string | null
    from?: string | null
  } = {}

  if (input.host !== undefined)
    dbData.host = input.host || null
  if (input.port !== undefined)
    dbData.port = input.port || null
  if (input.user !== undefined)
    dbData.user = input.user || null
  if (input.from !== undefined)
    dbData.from = input.from || null

  // 密码：空或脱敏占位符时不更新
  if (input.pass !== undefined && input.pass !== '' && input.pass !== PASSWORD_MASK) {
    dbData.pass = input.pass
  }

  await upsertSmtpSetting(dbData)
  await loadSmtpOverride()
  logger.info('SMTP settings updated')
}
