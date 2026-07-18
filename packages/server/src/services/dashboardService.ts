import { prisma } from '@/db/index.js'

export interface DashboardStats {
  totalDomains: number
  totalProviders: number
  expiringDomains: number
  activeDomains: number
}

export interface RecentNotification {
  id: number
  type: string
  content: string
  channel: string
  sentAt: string
  domainName?: string | null
}

export interface RecentRenewal {
  id: number
  status: string
  message: string | null
  domainName: string
  createdAt: string
}

export interface DashboardData {
  stats: DashboardStats
  recentNotifications: RecentNotification[]
  recentRenewals: RecentRenewal[]
  expiringDomains: {
    id: number
    name: string
    expiryDate: string | null
    daysUntilExpiry: number
    providerName?: string | null
  }[]
}

export async function getDashboardData(userId: number): Promise<DashboardData> {
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [
    totalDomains,
    totalProviders,
    expiringDomains,
    activeDomains,
    recentNotifications,
    recentRenewals,
    soonExpiringDomains,
  ] = await Promise.all([
    prisma.domain.count({ where: { userId } }),
    prisma.provider.count({ where: { userId } }),
    prisma.domain.count({
      where: {
        userId,
        status: 'active',
        expiryDate: {
          not: null,
          lte: thirtyDaysLater,
        },
      },
    }),
    prisma.domain.count({ where: { userId, status: 'active' } }),
    prisma.notificationLog.findMany({
      where: { userId },
      include: {
        domain: { select: { name: true } },
      },
      orderBy: { sentAt: 'desc' },
      take: 5,
    }),
    prisma.renewalLog.findMany({
      where: {
        domain: { userId },
      },
      include: {
        domain: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.domain.findMany({
      where: {
        userId,
        status: 'active',
        expiryDate: {
          not: null,
          lte: thirtyDaysLater,
        },
      },
      include: {
        provider: { select: { name: true } },
      },
      orderBy: { expiryDate: 'asc' },
      take: 5,
    }),
  ])

  return {
    stats: {
      totalDomains,
      totalProviders,
      expiringDomains,
      activeDomains,
    },
    recentNotifications: recentNotifications.map(log => ({
      id: log.id,
      type: log.type,
      content: log.content,
      channel: log.channel,
      sentAt: log.sentAt ? new Date(log.sentAt).toISOString() : '',
      domainName: log.domain?.name || null,
    })),
    recentRenewals: recentRenewals.map(log => ({
      id: log.id,
      status: log.status,
      message: log.message || null,
      domainName: log.domain?.name || '',
      createdAt: new Date(log.createdAt).toISOString(),
    })),
    expiringDomains: soonExpiringDomains.map((domain) => {
      const daysUntilExpiry = domain.expiryDate
        ? Math.ceil((new Date(domain.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0
      return {
        id: domain.id,
        name: domain.name,
        expiryDate: domain.expiryDate ? new Date(domain.expiryDate).toISOString() : null,
        daysUntilExpiry,
        providerName: domain.provider?.name || null,
      }
    }),
  }
}
