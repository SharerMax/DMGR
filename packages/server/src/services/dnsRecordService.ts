import type { CreateDNSRecordInput, DNSRecord, UpdateDNSRecordInput } from '../models/dnsRecord.js'
import {
  createDNSRecord,
  deleteDNSRecord,
  getDNSRecordById,
  getDNSRecordsByDomainId,
  updateDNSRecord,
} from '../models/dnsRecord.js'
import { getDomainById } from '../models/domain.js'
import { getProviderById } from '../models/provider.js'
import { DNSProviderFactory } from '../providers/index.js'
import { logger } from '../utils/index.js'
import { providerSupportsDnsManagement } from './providerService.js'

function parseConfig(config: string): Record<string, string> {
  try {
    return JSON.parse(config)
  }
  catch {
    return {}
  }
}

function getProviderConfig(provider: { type: string, config: string }) {
  const config = parseConfig(provider.config)
  return DNSProviderFactory.createProvider(provider.type, {
    apiKey: config.accessKeyId || config.secretId || config.apiKey || config.apiToken,
    apiSecret: config.accessKeySecret || config.secretKey || config.apiSecret,
  })
}

/**
 * 如果域名关联了 provider 但该 provider 不支持 DNS 管理，抛出错误。
 */
function validateProviderDnsFeature(provider: { type: string, userId: number } | null, userId: number) {
  if (provider && provider.userId === userId && !providerSupportsDnsManagement(provider.type)) {
    throw new Error('该域名所属的服务商不支持 DNS 记录管理')
  }
}

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

  const provider = domain.providerId ? await getProviderById(domain.providerId) : null
  validateProviderDnsFeature(provider, userId)

  if (provider && provider.userId === userId) {
    const dnsProvider = getProviderConfig(provider)
    if (dnsProvider && dnsProvider.validateConfig()) {
      try {
        const result = await dnsProvider.addDNSRecord(domain.name, {
          type: input.type as any,
          name: input.name,
          value: input.value,
          ttl: input.ttl,
          priority: input.priority ?? null,
        })
        if (!result.success) {
          logger.warn({ domain: domain.name, error: result.error }, 'Third-party DNS record creation failed, saving local only')
        }
        else if (result.data) {
          logger.info({ domain: domain.name, recordId: result.data.id }, 'Third-party DNS record created')
        }
      }
      catch (error: any) {
        logger.warn({ domain: domain.name, error: error.message }, 'Third-party DNS record creation error, saving local only')
      }
    }
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

  const provider = domain.providerId ? await getProviderById(domain.providerId) : null
  validateProviderDnsFeature(provider, userId)

  if (provider && provider.userId === userId) {
    const dnsProvider = getProviderConfig(provider)
    if (dnsProvider && dnsProvider.validateConfig()) {
      try {
        const result = await dnsProvider.updateDNSRecord(domain.name, String(recordId), {
          type: input.type as any,
          name: input.name,
          value: input.value,
          ttl: input.ttl,
          priority: input.priority ?? null,
        })
        if (!result.success) {
          logger.warn({ domain: domain.name, recordId, error: result.error }, 'Third-party DNS record update failed')
        }
        else {
          logger.info({ domain: domain.name, recordId }, 'Third-party DNS record updated')
        }
      }
      catch (error: any) {
        logger.warn({ domain: domain.name, recordId, error: error.message }, 'Third-party DNS record update error')
      }
    }
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

  const provider = domain.providerId ? await getProviderById(domain.providerId) : null
  validateProviderDnsFeature(provider, userId)

  if (provider && provider.userId === userId) {
    const dnsProvider = getProviderConfig(provider)
    if (dnsProvider && dnsProvider.validateConfig()) {
      try {
        const result = await dnsProvider.deleteDNSRecord(domain.name, String(recordId))
        if (!result.success) {
          logger.warn({ domain: domain.name, recordId, error: result.error }, 'Third-party DNS record deletion failed')
        }
        else {
          logger.info({ domain: domain.name, recordId }, 'Third-party DNS record deleted')
        }
      }
      catch (error: any) {
        logger.warn({ domain: domain.name, recordId, error: error.message }, 'Third-party DNS record deletion error')
      }
    }
  }

  return deleteDNSRecord(recordId)
}
