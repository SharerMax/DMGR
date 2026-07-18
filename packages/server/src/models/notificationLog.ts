import type { NotificationLogFilters } from 'share'
import type { NotificationLog } from '../prisma/generated/client'
import { prisma } from '../db/index.js'

export type { NotificationLog, NotificationLogFilters }

/** 后端内部过滤器（在共享类型基础上增加 userId 用于数据隔离） */
export type NotificationLogFiltersWithUser = NotificationLogFilters & { userId?: number }

export interface NotificationLogWithDomain extends NotificationLog {
  domain: {
    id: number
    name: string
  } | null
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

function buildWhere(filters: NotificationLogFiltersWithUser): any {
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
  filters: NotificationLogFiltersWithUser,
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
