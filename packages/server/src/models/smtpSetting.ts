import type { SmtpSetting } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { SmtpSetting }

/** 获取全局 SMTP 配置（单行，id=1） */
export async function getSmtpSetting(): Promise<SmtpSetting | null> {
  return prisma.smtpSetting.findUnique({ where: { id: 1 } })
}

/** 更新或创建全局 SMTP 配置（单行，id=1） */
export async function upsertSmtpSetting(input: {
  host?: string | null
  port?: number | null
  user?: string | null
  pass?: string | null
  from?: string | null
}): Promise<SmtpSetting> {
  return prisma.smtpSetting.upsert({
    where: { id: 1 },
    update: input,
    create: { id: 1, ...input },
  })
}
