import type { Domain } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { Domain }

export interface DomainWithProvider extends Domain {
  provider: { name: string } | null
}

export interface CreateDomainInput {
  name: string
  providerId?: number | null
  userId: number
  expiryDate?: string | null
  autoRenew?: boolean
  autoRenewDays?: number | null
  renewalPrice?: number | null
  notes?: string | null
}

export async function createDomain(input: CreateDomainInput): Promise<Domain> {
  return prisma.domain.create({
    data: {
      name: input.name,
      providerId: input.providerId,
      userId: input.userId,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      autoRenew: input.autoRenew ?? false,
      autoRenewDays: input.autoRenewDays,
      renewalPrice: input.renewalPrice,
      notes: input.notes,
    },
  })
}

export async function getDomainById(id: number): Promise<Domain | null> {
  return prisma.domain.findUnique({
    where: { id },
  })
}

export async function getDomainsByUserId(userId: number): Promise<(Domain & { provider: { name: string } | null })[]> {
  return prisma.domain.findMany({
    where: { userId },
    include: {
      provider: {
        select: { name: true },
      },
    },
    orderBy: { expiryDate: 'asc' },
  })
}

export async function getExpiringDomains(
  days: number,
): Promise<(Domain & { provider: { name: string } | null })[]> {
  const now = new Date()
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  return prisma.domain.findMany({
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
}

export interface UpdateDomainInput {
  name?: string
  providerId?: number | null
  expiryDate?: string | null
  autoRenew?: boolean
  autoRenewDays?: number | null
  renewalPrice?: number | null
  status?: string
  notes?: string | null
}

export async function updateDomain(
  id: number,
  input: UpdateDomainInput,
): Promise<Domain | null> {
  return prisma.domain.update({
    where: { id },
    data: {
      name: input.name,
      providerId: input.providerId,
      expiryDate: input.expiryDate === undefined ? undefined : input.expiryDate ? new Date(input.expiryDate) : null,
      autoRenew: input.autoRenew,
      autoRenewDays: input.autoRenewDays,
      renewalPrice: input.renewalPrice,
      status: input.status,
      notes: input.notes,
    },
  })
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
