import type { RenewalLog } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { RenewalLog }

export interface RenewalLogWithDomain extends RenewalLog {
  domain: {
    id: number
    name: string
    userId: number
    provider: {
      id: number
      name: string
      type: string
    } | null
  }
}

export interface RenewalLogFilters {
  domainId?: number
  domainName?: string
  status?: string
  startDate?: string
  endDate?: string
  userId?: number
}

export interface PaginatedRenewalLogs {
  data: RenewalLogWithDomain[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

function buildWhere(filters: RenewalLogFilters): any {
  const where: any = {}

  if (filters.domainId) {
    where.domainId = filters.domainId
  }
  if (filters.domainName) {
    where.domain = {
      ...where.domain,
      name: { contains: filters.domainName },
    }
  }
  if (filters.status) {
    where.status = filters.status
  }
  if (filters.startDate) {
    where.createdAt = {
      ...where.createdAt,
      gte: new Date(filters.startDate),
    }
  }
  if (filters.endDate) {
    where.createdAt = {
      ...where.createdAt,
      lte: new Date(`${filters.endDate}T23:59:59.999Z`),
    }
  }
  if (filters.userId) {
    where.domain = {
      ...where.domain,
      userId: filters.userId,
    }
  }

  return where
}

export async function getRenewalLogs(
  filters: RenewalLogFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedRenewalLogs> {
  const where = buildWhere(filters)

  const [total, logs] = await Promise.all([
    prisma.renewalLog.count({ where }),
    prisma.renewalLog.findMany({
      where,
      include: {
        domain: {
          select: {
            id: true,
            name: true,
            userId: true,
            provider: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    data: logs as RenewalLogWithDomain[],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function getRenewalLogById(id: number): Promise<(RenewalLog & {
  domain: { id: number, name: string, userId: number, provider: any }
}) | null> {
  return prisma.renewalLog.findUnique({
    where: { id },
    include: {
      domain: {
        include: { provider: true },
      },
    },
  }) as Promise<any>
}

export interface RenewalStats {
  total: number
  completed: number
  failed: number
  pending: number
  skipped: number
  successRate: number
}

export async function getRenewalStats(domainIds: number[]): Promise<RenewalStats> {
  const [total, completed, failed, pending, skipped] = await Promise.all([
    prisma.renewalLog.count({ where: { domainId: { in: domainIds } } }),
    prisma.renewalLog.count({ where: { domainId: { in: domainIds }, status: 'completed' } }),
    prisma.renewalLog.count({ where: { domainId: { in: domainIds }, status: 'failed' } }),
    prisma.renewalLog.count({ where: { domainId: { in: domainIds }, status: 'pending' } }),
    prisma.renewalLog.count({ where: { domainId: { in: domainIds }, status: 'skipped' } }),
  ])

  return {
    total,
    completed,
    failed,
    pending,
    skipped,
    successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

export async function getRecentRenewalLogs(domainIds: number[], days = 7, limit = 10) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  return prisma.renewalLog.findMany({
    where: {
      domainId: { in: domainIds },
      createdAt: { gte: since },
    },
    include: {
      domain: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function createRenewalLog(data: {
  domainId: number
  status: string
  message?: string
  details?: string
}): Promise<RenewalLog> {
  return prisma.renewalLog.create({ data })
}
