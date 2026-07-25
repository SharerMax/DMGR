import type { NsCheckSetting } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { NsCheckSetting }

/** 获取全局 NS 检查服务器配置（单行，id=1） */
export async function getNsCheckSetting(): Promise<NsCheckSetting | null> {
  return prisma.nsCheckSetting.findUnique({ where: { id: 1 } })
}

/** 更新或创建全局 NS 检查服务器配置（单行，id=1） */
export async function upsertNsCheckSetting(input: {
  server?: string | null
}): Promise<NsCheckSetting> {
  return prisma.nsCheckSetting.upsert({
    where: { id: 1 },
    update: input,
    create: { id: 1, ...input },
  })
}
