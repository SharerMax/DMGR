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
import {
  createReminder,
  deleteRemindersByDomainId,
  getRemindersByDomainId,

} from '../models/reminder.js'

export interface DomainWithReminders extends Domain {
  provider: { name: string } | null
  provider_name?: string | null
  reminders: Reminder[]
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
  return createDomain({ ...input, userId })
}

export async function updateUserDomain(userId: number, domainId: number, input: UpdateDomainInput) {
  const domain = await getDomainById(domainId)
  if (!domain || domain.userId !== userId) {
    return null
  }
  return updateDomain(domainId, input)
}

export async function deleteUserDomain(userId: number, domainId: number): Promise<boolean> {
  const domain = await getDomainById(domainId)
  if (!domain || domain.userId !== userId) {
    return false
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
