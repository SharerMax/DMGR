import type { CreateDomainInput, Domain, UpdateDomainInput } from '../models/domain.js'
import type { Reminder } from '../models/reminder.js'
import {
  createDomain,
  deleteDomain,
  getDomainById,
  getDomainsByUserId,
  getExpiringDomains,
  updateDomain,
} from '../models/domain.js'
import { getProviderById } from '../models/provider.js'
import {
  createReminder,
  deleteRemindersByDomainId,
  getRemindersByDomainId,
} from '../models/reminder.js'
import { DNSProviderFactory } from '../providers/index.js'
import { logger } from '../utils/index.js'

export interface DomainWithReminders extends Domain {
  provider: { name: string } | null
  provider_name?: string | null
  reminders: Reminder[]
}

function parseConfig(config: string): Record<string, string> {
  try {
    return JSON.parse(config)
  }
  catch {
    return {}
  }
}

function getSyncer(provider: { type: string, config: string }) {
  const config = parseConfig(provider.config)
  return DNSProviderFactory.createSyncer(provider.type, {
    apiKey: config.accessKeyId || config.secretId || config.apiKey || config.apiToken,
    apiSecret: config.accessKeySecret || config.secretKey || config.apiSecret,
  })
}

export async function getUserDomains(
  userId: number,
  filters?: { search?: string, providerId?: number },
): Promise<DomainWithReminders[]> {
  let domains = await getDomainsByUserId(userId)

  if (filters?.search) {
    const searchTerm = String(filters.search).toLowerCase()
    domains = domains.filter(d => d.name.toLowerCase().includes(searchTerm))
  }

  if (filters?.providerId) {
    domains = domains.filter(d => d.providerId === filters.providerId)
  }

  const domainsWithReminders = await Promise.all(
    domains.map(async (domain) => {
      const reminders = await getRemindersByDomainId(domain.id)
      return {
        ...domain,
        provider_name: domain.provider?.name,
        reminders,
      }
    }),
  )

  return domainsWithReminders
}

export async function getUserExpiringDomains(userId: number, days = 30) {
  const domains = await getExpiringDomains(days)
  return domains.filter(d => d.userId === userId)
}

export async function getDomainWithReminders(userId: number, domainId: number) {
  const domain = await getDomainById(domainId)
  if (!domain || domain.userId !== userId) {
    return null
  }
  const reminders = await getRemindersByDomainId(domainId)
  return { ...domain, reminders }
}

export async function createUserDomain(userId: number, input: Omit<CreateDomainInput, 'userId'>) {
  const domain = await createDomain({ ...input, userId })

  if (input.providerId) {
    const provider = await getProviderById(input.providerId)
    if (provider && provider.userId === userId) {
      const syncer = getSyncer(provider)
      if (syncer && syncer.validateConfig()) {
        try {
          const info = await syncer.getDomainInfo(domain.name)
          if (info.success && info.data) {
            logger.info({ domainId: domain.id, name: domain.name }, 'Third-party domain info synced on create')
          }
        }
        catch (error: any) {
          logger.warn({ domainId: domain.id, name: domain.name, error: error.message }, 'Third-party domain sync failed on create')
        }
      }
    }
  }

  return domain
}

export async function updateUserDomain(userId: number, domainId: number, input: UpdateDomainInput) {
  const domain = await getDomainById(domainId)
  if (!domain || domain.userId !== userId) {
    return null
  }

  const updated = await updateDomain(domainId, input)

  if (updated && updated.providerId) {
    const provider = await getProviderById(updated.providerId)
    if (provider && provider.userId === userId) {
      const syncer = getSyncer(provider)
      if (syncer && syncer.validateConfig()) {
        try {
          const info = await syncer.getDomainInfo(updated.name)
          if (info.success && info.data) {
            logger.info({ domainId, name: updated.name }, 'Third-party domain info synced on update')
          }
        }
        catch (error: any) {
          logger.warn({ domainId, name: updated.name, error: error.message }, 'Third-party domain sync failed on update')
        }
      }
    }
  }

  return updated
}

export async function deleteUserDomain(userId: number, domainId: number): Promise<boolean> {
  const domain = await getDomainById(domainId)
  if (!domain || domain.userId !== userId) {
    return false
  }

  if (domain.providerId) {
    const provider = await getProviderById(domain.providerId)
    if (provider && provider.userId === userId) {
      const syncer = getSyncer(provider)
      if (syncer && syncer.validateConfig()) {
        logger.info({ domainId, name: domain.name }, 'Domain removed from local, third-party data preserved')
      }
    }
  }

  await deleteRemindersByDomainId(domainId)
  return deleteDomain(domainId)
}

export async function addDomainReminder(userId: number, domainId: number, daysBefore: number) {
  const domain = await getDomainById(domainId)
  if (!domain || domain.userId !== userId) {
    return null
  }
  return createReminder({ domainId, daysBefore })
}

export async function verifyDomainOwnership(userId: number, domainId: number): Promise<boolean> {
  const domain = await getDomainById(domainId)
  return domain?.userId === userId
}
