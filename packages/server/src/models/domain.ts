import type { CreateDomainInput, UpdateDomainInput } from 'share'
import type { Domain } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { CreateDomainInput, Domain, UpdateDomainInput }

export interface DomainWithProvider extends Domain {
  provider: { name: string } | null
}

/**
 * 将 Prisma Domain 的 nameServers（JSON 字符串）解析为 string[] | null。
 * 其他字段保持 Prisma 原始类型（日期为 Date，由 Express 序列化为 ISO 字符串）。
 */
function transformNameServers<T extends { nameServers: string | null }>(d: T): T {
  if (!d.nameServers) {
    return { ...d, nameServers: null }
  }
  try {
    return { ...d, nameServers: JSON.parse(d.nameServers) }
  }
  catch {
    return { ...d, nameServers: null }
  }
}

export async function createDomain(input: CreateDomainInput & { userId: number }): Promise<Domain> {
  const domain = await prisma.domain.create({
    data: {
      name: input.name,
      providerId: input.providerId,
      userId: input.userId,
      registrationDate: input.registrationDate ? new Date(input.registrationDate) : null,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      autoRenew: input.autoRenew ?? false,
      autoRenewDays: input.autoRenewDays,
      renewalPrice: input.renewalPrice,
      nameServers: input.nameServers && input.nameServers.length > 0 ? JSON.stringify(input.nameServers) : null,
      notes: input.notes,
    },
  })
  return transformNameServers(domain)
}

export async function getDomainById(id: number): Promise<Domain | null> {
  const domain = await prisma.domain.findUnique({
    where: { id },
  })
  return domain ? transformNameServers(domain) : null
}

export async function getDomainsByUserId(userId: number): Promise<(Domain & { provider: { name: string } | null })[]> {
  const domains = await prisma.domain.findMany({
    where: { userId },
    include: {
      provider: {
        select: { name: true },
      },
    },
    orderBy: { expiryDate: 'asc' },
  })
  return domains.map(transformNameServers)
}

export async function getDomainsByProviderId(providerId: number): Promise<Domain[]> {
  const domains = await prisma.domain.findMany({
    where: { providerId },
  })
  return domains.map(transformNameServers)
}

export async function getExpiringDomains(
  days: number,
): Promise<(Domain & { provider: { name: string } | null })[]> {
  const now = new Date()
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const domains = await prisma.domain.findMany({
    where: {
      status: 'active',
      expiryDate: {
        not: null,
        lte: futureDate,
      },
    },
    include: {
      provider: {
        select: { name: true },
      },
    },
    orderBy: { expiryDate: 'asc' },
  })
  return domains.map(transformNameServers)
}

export async function updateDomain(
  id: number,
  input: UpdateDomainInput,
): Promise<Domain | null> {
  const domain = await prisma.domain.update({
    where: { id },
    data: {
      name: input.name,
      providerId: input.providerId,
      registrationDate: input.registrationDate === undefined ? undefined : input.registrationDate ? new Date(input.registrationDate) : null,
      expiryDate: input.expiryDate === undefined ? undefined : input.expiryDate ? new Date(input.expiryDate) : null,
      autoRenew: input.autoRenew,
      autoRenewDays: input.autoRenewDays,
      renewalPrice: input.renewalPrice,
      nameServers: input.nameServers === undefined
        ? undefined
        : input.nameServers && input.nameServers.length > 0
          ? JSON.stringify(input.nameServers)
          : null,
      status: input.status,
      notes: input.notes,
    },
  })
  return transformNameServers(domain)
}

export async function deleteDomain(id: number): Promise<boolean> {
  try {
    await prisma.domain.delete({
      where: { id },
    })
    return true
  }
  catch {
    return false
  }
}
