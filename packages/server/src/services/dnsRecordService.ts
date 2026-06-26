import type { CreateDNSRecordInput, DNSRecord, UpdateDNSRecordInput } from '../models/dnsRecord.js'
import {
  createDNSRecord,

  deleteDNSRecord,

  getDNSRecordById,
  getDNSRecordsByDomainId,
  updateDNSRecord,

} from '../models/dnsRecord.js'
import { getDomainById } from '../models/domain.js'

export async function getDomainDNSRecords(userId: number, domainId: number): Promise<DNSRecord[]> {
  const domain = await getDomainById(domainId)
  if (!domain || domain.userId !== userId) {
    throw new Error('域名不存在')
  }
  return getDNSRecordsByDomainId(domainId)
}

export async function getDNSRecord(userId: number, recordId: number): Promise<DNSRecord | null> {
  const record = await getDNSRecordById(recordId)
  if (!record) {
    return null
  }

  const domain = await getDomainById(record.domainId)
  if (!domain || domain.userId !== userId) {
    return null
  }

  return record
}

export async function createDomainDNSRecord(
  userId: number,
  input: CreateDNSRecordInput,
): Promise<DNSRecord> {
  const domain = await getDomainById(input.domainId)
  if (!domain || domain.userId !== userId) {
    throw new Error('域名不存在')
  }
  return createDNSRecord(input)
}

export async function updateDomainDNSRecord(
  userId: number,
  recordId: number,
  input: UpdateDNSRecordInput,
): Promise<DNSRecord | null> {
  const record = await getDNSRecordById(recordId)
  if (!record) {
    return null
  }

  const domain = await getDomainById(record.domainId)
  if (!domain || domain.userId !== userId) {
    return null
  }

  return updateDNSRecord(recordId, input)
}

export async function deleteDomainDNSRecord(userId: number, recordId: number): Promise<boolean> {
  const record = await getDNSRecordById(recordId)
  if (!record) {
    return false
  }

  const domain = await getDomainById(record.domainId)
  if (!domain || domain.userId !== userId) {
    return false
  }

  return deleteDNSRecord(recordId)
}
