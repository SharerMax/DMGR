import type { SyncLogFilters } from 'share'
import type { SyncLog } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { SyncLog, SyncLogFilters }

/** 后端内部过滤器（在共享类型基础上增加 userId 用于数据隔离） */
export type SyncLogFiltersWithUser = SyncLogFilters & { userId?: number }

export interface SyncLogWithProvider extends SyncLog {
  provider: {
    id: number
    name: string
    type: string
  }
}

export interface PaginatedSyncLogs {
  data: SyncLogWithProvider[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

function buildWhere(filters: SyncLogFiltersWithUser): any {
  const where: any = {}

  if (filters.providerId) {
    where.providerId = filters.providerId
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
    where.userId = filters.userId
  }

  return where
}

export async function getSyncLogs(
  filters: SyncLogFiltersWithUser,
  page: number,
  pageSize: number,
): Promise<PaginatedSyncLogs> {
  const where = buildWhere(filters)

  const [total, logs] = await Promise.all([
    prisma.syncLog.count({ where }),
    prisma.syncLog.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    data: logs as SyncLogWithProvider[],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function getSyncLogById(id: number): Promise<SyncLogWithProvider | null> {
  return prisma.syncLog.findUnique({
    where: { id },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  }) as Promise<SyncLogWithProvider | null>
}

export async function createSyncLog(data: {
  providerId: number
  userId: number
  status: string
  domainsSynced?: number
  dnsInserted?: number
  dnsDeleted?: number
  error?: string
  details?: string
}): Promise<SyncLog> {
  return prisma.syncLog.create({ data })
}
