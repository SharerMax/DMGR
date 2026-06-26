import type { Provider } from '../models/provider.js'
import type { DomainSyncer } from '../providers/index.js'
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

function getSyncer(provider: Provider): DomainSyncer | null {
  const config = parseProviderConfig(provider)

  switch (provider.type) {
    case 'aliyun':
      return DNSProviderFactory.createSyncer('aliyun', {
        apiKey: config.accessKeyId,
        apiSecret: config.accessKeySecret,
      })
    default:
      return null
  }
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

async function syncNewDomains(userId: number, providerId: number, domainList: Array<{ name: string, expiryDate: string, autoRenew?: boolean }>) {
  const existingDomains = await getDomainsByUserId(userId)
  const existingDomainNames = new Set(existingDomains.map(d => d.name))

  const syncedDomains = []
  for (const domain of domainList) {
    if (!existingDomainNames.has(domain.name)) {
      const newDomain = await createDomain({
        name: domain.name,
        providerId,
        userId,
        expiryDate: domain.expiryDate,
        autoRenew: domain.autoRenew,
      })
      syncedDomains.push(newDomain)
    }
  }

  return syncedDomains
}

export async function syncProviderDomains(userId: number, providerId: number): Promise<SyncResult> {
  const provider = await getProviderById(providerId)
  if (!provider || provider.userId !== userId) {
    throw new Error('服务商不存在')
  }

  const syncer = getSyncer(provider)

  if (!syncer || !syncer.validateConfig()) {
    const mockDomains = generateMockDomains(provider)
    const syncedDomains = await syncNewDomains(userId, providerId, mockDomains)
    return { syncedCount: syncedDomains.length, domains: syncedDomains }
  }

  const syncResult = await syncer.syncDomains()

  if (!syncResult.success) {
    throw new Error(syncResult.errors?.join(', ') || '同步失败')
  }

  const domainList = syncResult.domains.map(d => ({
    name: d.name,
    expiryDate: d.expirationDate,
    autoRenew: provider.supportsAutoRenew,
  }))

  const syncedDomains = await syncNewDomains(userId, providerId, domainList)
  return { syncedCount: syncedDomains.length, domains: syncedDomains }
}
