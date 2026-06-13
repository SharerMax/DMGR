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
