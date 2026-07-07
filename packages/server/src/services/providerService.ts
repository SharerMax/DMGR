import type { Provider } from '../models/provider.js'
import type { DomainSyncer } from '../providers/index.js'
import logger from '@/utils/logger.js'
import { syncDomainDNSRecords } from '../models/dnsRecord.js'
import { createDomain, getDomainsByUserId } from '../models/domain.js'
import {
  createProvider,
  deleteProvider,
  getProviderById,
  getProvidersByUserId,

  updateProvider,
} from '../models/provider.js'
import { BUILT_IN_PROVIDERS, DNSProviderFactory, getProviderConfig } from '../providers/index.js'

export interface SyncResult {
  syncedCount: number
  domains: any[]
  dnsRecordsInserted: number
  dnsRecordsDeleted: number
}

export function getSupportedProviderTypes() {
  return BUILT_IN_PROVIDERS.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    fields: p.fields.map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder,
      description: f.description,
    })),
    supportsAutoRenew: p.supportsAutoRenew,
    maxRenewalDays: p.maxRenewalDays,
    features: p.features,
  }))
}

export async function getUserProviders(userId: number): Promise<Provider[]> {
  return getProvidersByUserId(userId)
}

export async function getUserProvider(userId: number, providerId: number): Promise<Provider | null> {
  const provider = await getProviderById(providerId)
  if (!provider || provider.userId !== userId) {
    return null
  }
  return provider
}

function validateProviderConfig(type: string, config: Record<string, any>): string[] {
  const providerConfig = getProviderConfig(type)
  if (!providerConfig) {
    return ['不支持的服务商类型']
  }

  const missingFields = providerConfig.fields
    .filter(f => f.required && !config[f.key])
    .map(f => f.label)

  return missingFields
}

export async function createUserProvider(
  userId: number,
  data: { type: string, name: string, config: Record<string, string>, supportsAutoRenew?: boolean },
): Promise<Provider> {
  const missingFields = validateProviderConfig(data.type, data.config)
  if (missingFields.length > 0) {
    throw new Error(`缺少必填字段: ${missingFields.join(', ')}`)
  }

  const providerConfig = getProviderConfig(data.type)
  return createProvider({
    type: data.type,
    name: data.name,
    config: data.config,
    supportsAutoRenew: providerConfig?.supportsAutoRenew ?? data.supportsAutoRenew,
    userId,
  })
}

export async function updateUserProvider(
  userId: number,
  providerId: number,
  data: Partial<{ type: string, name: string, config: Record<string, string>, supportsAutoRenew: boolean }>,
): Promise<Provider | null> {
  const provider = await getProviderById(providerId)
  if (!provider || provider.userId !== userId) {
    return null
  }

  if (data.type) {
    const providerConfig = getProviderConfig(data.type)
    if (!providerConfig) {
      throw new Error('不支持的服务商类型')
    }
  }

  const updateData: any = { ...data }
  if (data.config) {
    updateData.config = JSON.stringify(data.config)
  }

  return updateProvider(providerId, updateData)
}

export async function deleteUserProvider(userId: number, providerId: number): Promise<boolean> {
  const provider = await getProviderById(providerId)
  if (!provider || provider.userId !== userId) {
    return false
  }
  return deleteProvider(providerId)
}

function parseProviderConfig(provider: Provider): Record<string, string> {
  try {
    return JSON.parse(provider.config)
  }
  catch {
    return {}
  }
}

/**
 * 根据 provider 的 type 构造对应 DomainSyncer 所需的配置对象。
 * 不同服务商使用不同的字段名保存凭证。
 */
function buildSyncerConfig(type: string, parsed: Record<string, any>): Record<string, any> {
  switch (type) {
    case 'aliyun':
      return {
        accessKeyId: parsed.accessKeyId,
        accessKeySecret: parsed.accessKeySecret,
      }
    case 'tencent':
      return {
        secretId: parsed.secretId,
        secretKey: parsed.secretKey,
      }
    case 'cloudflare':
      return {
        apiToken: parsed.apiToken,
        email: parsed.email,
      }
    case 'dnspod':
      return {
        loginToken: parsed.loginToken,
      }
    case 'namecheap':
      return {
        apiUser: parsed.apiUser,
        apiKey: parsed.apiKey,
        clientIp: parsed.clientIp,
      }
    case 'vps8':
      return {
        apiKey: parsed.apiKey,
        apiUrl: parsed.apiUrl,
      }
    default:
      return {}
  }
}

function getSyncer(provider: Provider): DomainSyncer | null {
  const config = parseProviderConfig(provider)
  const syncerConfig = buildSyncerConfig(provider.type, config)
  return DNSProviderFactory.createSyncer(provider.type, syncerConfig)
}

function generateMockDomains(provider: Provider) {
  return [
    {
      name: 'example1.com',
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: provider.supportsAutoRenew,
    },
    {
      name: 'example2.com',
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: provider.supportsAutoRenew,
    },
  ]
}

async function syncNewDomains(userId: number, providerId: number, domainList: Array<{ name: string, expiryDate?: string | null, autoRenew?: boolean }>) {
  const existingDomains = await getDomainsByUserId(userId)
  const existingDomainNames = new Set(existingDomains.map(d => d.name))

  const syncedDomains = []
  for (const domain of domainList) {
    if (!existingDomainNames.has(domain.name)) {
      logger.info(`同步域名: ${domain.name} ${domain.expiryDate} ${domain.autoRenew}`)
      const newDomain = await createDomain({
        name: domain.name,
        providerId,
        userId,
        expiryDate: domain.expiryDate || null,
        autoRenew: domain.autoRenew,
      })
      syncedDomains.push(newDomain)
    }
  }

  return syncedDomains
}

/**
 * 同步指定 provider 下所有域名及其 DNS 记录。
 * - 从服务商获取域名列表，插入本地尚未保存的域名
 * - 对本地已存在且归属于该 provider 的域名，以及新增的域名，调用 syncer 同步其 DNS 记录
 */
export async function syncProviderDomains(userId: number, providerId: number): Promise<SyncResult> {
  const provider = await getProviderById(providerId)
  if (!provider || provider.userId !== userId) {
    throw new Error('服务商不存在')
  }

  const syncer = getSyncer(provider)

  if (!syncer || !syncer.validateConfig()) {
    const mockDomains = generateMockDomains(provider)
    const syncedDomains = await syncNewDomains(userId, providerId, mockDomains)
    return {
      syncedCount: syncedDomains.length,
      domains: syncedDomains,
      dnsRecordsInserted: 0,
      dnsRecordsDeleted: 0,
    }
  }

  const syncResult = await syncer.syncDomains()

  if (!syncResult.success) {
    throw new Error(syncResult.errors?.join(', ') || '同步失败')
  }

  const domainList = syncResult.domains.map(d => ({
    name: d.name,
    expiryDate: d.expirationDate || null,
    autoRenew: provider.supportsAutoRenew,
  }))

  const newDomains = await syncNewDomains(userId, providerId, domainList)

  // 同步 DNS 记录：覆盖本次从服务商返回的所有域名
  // 包含新创建的域名以及之前已存在的同名域名
  const allUserDomains = await getDomainsByUserId(userId)
  const domainNameToId = new Map<string, number>()
  for (const d of allUserDomains) {
    if (d.providerId === providerId || newDomains.some(nd => nd.id === d.id)) {
      domainNameToId.set(d.name, d.id)
    }
  }
  // 合并新增域名（providerId 在新创建的对象上是正确的）
  for (const d of newDomains) {
    domainNameToId.set(d.name, d.id)
  }

  let totalInserted = 0
  let totalDeleted = 0

  for (const domain of domainList) {
    const domainId = domainNameToId.get(domain.name)
    if (!domainId) {
      continue
    }
    try {
      const recordsResult = await syncer.syncDomainRecords(domain.name)
      if (recordsResult.success && recordsResult.data) {
        const normalized = recordsResult.data.map(r => ({
          type: r.type,
          name: r.name,
          value: r.value,
          ttl: r.ttl,
          priority: r.priority ?? null,
        }))
        const { inserted, deleted } = await syncDomainDNSRecords(domainId, normalized)
        totalInserted += inserted
        totalDeleted += deleted
        logger.info(
          { domainId, domain: domain.name, inserted, deleted },
          'DNS records synced',
        )
      }
      else {
        logger.warn(
          { domain: domain.name, error: recordsResult.error },
          'Failed to sync DNS records for domain',
        )
      }
    }
    catch (error) {
      logger.error(
        { domain: domain.name, error },
        'Exception while syncing DNS records',
      )
    }
  }

  return {
    syncedCount: newDomains.length,
    domains: newDomains,
    dnsRecordsInserted: totalInserted,
    dnsRecordsDeleted: totalDeleted,
  }
}
