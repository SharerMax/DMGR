import type { NotificationLog } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { NotificationLog }

export interface NotificationLogWithDomain extends NotificationLog {
  domain: {
    id: number
    name: string
  } | null
}

export interface NotificationLogFilters {
  type?: string
  channel?: string
  domainId?: number
  startDate?: string
  endDate?: string
  userId?: number
}

export interface PaginatedNotificationLogs {
  data: NotificationLogWithDomain[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

function buildWhere(filters: NotificationLogFilters): any {
  const where: any = {}

  if (filters.type) {
    where.type = filters.type
  }
  if (filters.channel) {
    where.channel = { contains: filters.channel }
  }
  if (filters.domainId) {
    where.domainId = filters.domainId
  }
  if (filters.startDate) {
    where.sentAt = {
      ...where.sentAt,
      gte: new Date(filters.startDate),
    }
  }
  if (filters.endDate) {
    where.sentAt = {
      ...where.sentAt,
      lte: new Date(`${filters.endDate}T23:59:59.999Z`),
    }
  }
  if (filters.userId) {
    where.userId = filters.userId
  }

  return where
}

export async function getNotificationLogs(
  filters: NotificationLogFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedNotificationLogs> {
  const where = buildWhere(filters)

  const [total, logs] = await Promise.all([
    prisma.notificationLog.count({ where }),
    prisma.notificationLog.findMany({
      where,
      include: {
        domain: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    data: logs as NotificationLogWithDomain[],
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function getNotificationLogById(id: number): Promise<NotificationLogWithDomain | null> {
  return prisma.notificationLog.findUnique({
    where: { id },
    include: {
      domain: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  }) as Promise<NotificationLogWithDomain | null>
}

export async function createNotificationLog(data: {
  userId: number
  domainId?: number | null
  type: string
  content: string
  channel: string
}): Promise<NotificationLog> {
  return prisma.notificationLog.create({ data })
}
