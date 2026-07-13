import type { DNSRecord } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { DNSRecord }

export interface CreateDNSRecordInput {
  domainId: number
  type: string
  name: string
  value: string
  ttl?: number
  priority?: number
}

export interface UpdateDNSRecordInput {
  type?: string
  name?: string
  value?: string
  ttl?: number
  priority?: number
}

export async function createDNSRecord(input: CreateDNSRecordInput): Promise<DNSRecord> {
  return prisma.dNSRecord.create({
    data: {
      domainId: input.domainId,
      type: input.type,
      name: input.name,
      value: input.value,
      ttl: input.ttl ?? 3600,
      priority: input.priority,
    },
  })
}

export async function getDNSRecordById(id: number): Promise<DNSRecord | null> {
  return prisma.dNSRecord.findUnique({
    where: { id },
  })
}

export async function getDNSRecordsByDomainId(domainId: number): Promise<DNSRecord[]> {
  return prisma.dNSRecord.findMany({
    where: { domainId },
    orderBy: { type: 'asc' },
  })
}

export async function updateDNSRecord(
  id: number,
  input: UpdateDNSRecordInput,
): Promise<DNSRecord | null> {
  const data: Record<string, unknown> = {}
  if (input.type !== undefined)
    data.type = input.type
  if (input.name !== undefined)
    data.name = input.name
  if (input.value !== undefined)
    data.value = input.value
  if (input.ttl !== undefined)
    data.ttl = input.ttl
  if (input.priority !== undefined)
    data.priority = input.priority

  return prisma.dNSRecord.update({
    where: { id },
    data,
  })
}

export async function deleteDNSRecord(id: number): Promise<boolean> {
  try {
    await prisma.dNSRecord.delete({
      where: { id },
    })
    return true
  }
  catch {
    return false
  }
}

export async function deleteDNSRecordsByDomainId(domainId: number): Promise<void> {
  await prisma.dNSRecord.deleteMany({
    where: { domainId },
  })
}

export interface SyncDNSRecordInput {
  type: string
  name: string
  value: string
  ttl?: number
  priority?: number | null
}

export interface DNSRecordChange {
  type: string
  name: string
  value: string
}

export interface SyncDNSResult {
  inserted: number
  deleted: number
  insertedRecords: DNSRecordChange[]
  deletedRecords: DNSRecordChange[]
}

/**
 * 将从服务商获取的 DNS 记录与数据库中的记录进行全量同步。
 * - 不存在的记录会被插入
 * - 数据库中存在但不在传入列表中的记录会被删除
 * - 输入的记录将整体替换当前域名下的记录
 */
export async function syncDomainDNSRecords(
  domainId: number,
  records: SyncDNSRecordInput[],
): Promise<SyncDNSResult> {
  const existing = await prisma.dNSRecord.findMany({
    where: { domainId },
    select: { id: true, type: true, name: true, value: true, ttl: true, priority: true },
  })

  const normalize = (r: { type: string, name: string, value: string }) =>
    `${r.type}|${r.name}|${r.value}`

  const incomingMap = new Map<string, SyncDNSRecordInput>()
  for (const r of records) {
    incomingMap.set(normalize(r), r)
  }

  const existingSet = new Set(existing.map(normalize))
  const toDelete = existing.filter(e => !incomingMap.has(normalize(e)))
  const toInsert = records.filter(r => !existingSet.has(normalize(r)))

  if (toDelete.length > 0) {
    await prisma.dNSRecord.deleteMany({
      where: { id: { in: toDelete.map(r => r.id) } },
    })
  }

  if (toInsert.length > 0) {
    await prisma.dNSRecord.createMany({
      data: toInsert.map(r => ({
        domainId,
        type: r.type,
        name: r.name,
        value: r.value,
        ttl: r.ttl ?? 3600,
        priority: r.priority ?? undefined,
      })),
    })
  }

  return {
    inserted: toInsert.length,
    deleted: toDelete.length,
    insertedRecords: toInsert.map(r => ({ type: r.type, name: r.name, value: r.value })),
    deletedRecords: toDelete.map(r => ({ type: r.type, name: r.name, value: r.value })),
  }
}
