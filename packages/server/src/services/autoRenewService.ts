/**
 * 自动续期服务
 * 定期检查需要续期的域名并自动执行续期
 */

import { differenceInDays } from 'date-fns'
import cron from 'node-cron'
import { logger } from '@/utils/index.js'
import { prisma } from '../db/index.js'
import { DNSProviderFactory, getProviderConfig } from '../providers/index.js'
import { sendNotification } from './notificationService.js'
import { providerSupportsAutoRenew } from './providerService.js'

export type RenewalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'

export interface RenewalResult {
  domainId: number
  domainName: string
  status: RenewalStatus
  message?: string
  error?: string
  renewedAt?: Date
}

export async function createRenewalLog(
  domainId: number,
  status: RenewalStatus,
  message?: string,
  error?: string,
) {
  return prisma.renewalLog.create({
    data: {
      domainId,
      status,
      message,
      error,
    },
  })
}

export async function getDomainsNeedingRenewal(): Promise<Array<{
  domain: {
    id: number
    name: string
    userId: number
    expiryDate: Date | null
    autoRenew: boolean
    autoRenewDays: number | null
  }
  provider: {
    id: number
    type: string
    config: Record<string, string>
  } | null
}>> {
  const now = new Date()

  const domains = await prisma.domain.findMany({
    where: {
      autoRenew: true,
      expiryDate: { gt: now },
      status: 'active',
    },
    include: {
      provider: true,
    },
  })

  return domains
    .map(domain => ({
      domain: {
        id: domain.id,
        name: domain.name,
        userId: domain.userId,
        expiryDate: domain.expiryDate,
        autoRenew: domain.autoRenew,
        autoRenewDays: domain.autoRenewDays,
      },
      provider: domain.provider
        ? {
            id: domain.provider.id,
            type: domain.provider.type,
            config: (() => {
              try {
                return JSON.parse(domain.provider!.config)
              }
              catch {
                return {}
              }
            })(),
          }
        : null,
    }))
    .filter(({ domain, provider }) => {
      if (!domain.expiryDate) {
        return false
      }

      const daysUntilExpiry = differenceInDays(domain.expiryDate, now)
      const triggerDays = domain.autoRenewDays || 30

      if (!provider || !providerSupportsAutoRenew(provider.type)) {
        return false
      }

      const providerConfig = getProviderConfig(provider.type)
      if (providerConfig && providerConfig.maxRenewalDays) {
        if (daysUntilExpiry > providerConfig.maxRenewalDays) {
          return false
        }
      }

      return daysUntilExpiry <= triggerDays
    })
}

export async function renewDomain(
  domainId: number,
  domainName: string,
  providerType: string,
  config: Record<string, string>,
): Promise<RenewalResult> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingLog = await prisma.renewalLog.findFirst({
    where: {
      domainId,
      status: { in: ['completed', 'failed'] },
      createdAt: { gte: today },
    },
  })

  if (existingLog) {
    return {
      domainId,
      domainName,
      status: 'skipped',
      message: '今日已尝试过续期，跳过',
    }
  }

  const renewer = DNSProviderFactory.createRenewer(providerType, config)
  if (!renewer) {
    const error = `不支持的服务商类型: ${providerType}`
    await createRenewalLog(domainId, 'failed', undefined, error)
    return {
      domainId,
      domainName,
      status: 'failed',
      error,
    }
  }

  if (!renewer.validateConfig()) {
    const error = `${providerType} 服务商配置不完整`
    await createRenewalLog(domainId, 'failed', undefined, error)
    return {
      domainId,
      domainName,
      status: 'failed',
      error,
    }
  }

  try {
    const result = await renewer.renewDomain(domainName)

    if (result.success) {
      await createRenewalLog(domainId, 'completed', '续期成功')
      return {
        domainId,
        domainName,
        status: 'completed',
        message: '续期成功',
        renewedAt: new Date(),
      }
    }
    else {
      await createRenewalLog(domainId, 'failed', undefined, result.error)
      return {
        domainId,
        domainName,
        status: 'failed',
        error: result.error,
      }
    }
  }
  catch (error: any) {
    const errorMessage = error.message || '续期失败'
    await createRenewalLog(domainId, 'failed', undefined, errorMessage)
    return {
      domainId,
      domainName,
      status: 'failed',
      error: errorMessage,
    }
  }
}

export async function executeAutoRenewal(): Promise<{
  processed: number
  succeeded: number
  failed: number
  skipped: number
  results: RenewalResult[]
}> {
  logger.info('Starting auto renewal check')

  const domainsToRenew = await getDomainsNeedingRenewal()
  logger.info({ count: domainsToRenew.length }, 'Found domains needing renewal')

  const results: RenewalResult[] = []
  let succeeded = 0
  let failed = 0
  let skipped = 0

  for (const { domain, provider } of domainsToRenew) {
    if (!provider) {
      results.push({
        domainId: domain.id,
        domainName: domain.name,
        status: 'skipped',
        error: '域名未关联服务商',
      })
      skipped++
      continue
    }

    const result = await renewDomain(
      domain.id,
      domain.name,
      provider.type,
      provider.config,
    )

    results.push(result)

    switch (result.status) {
      case 'completed':
        succeeded++
        await sendNotification(domain.userId, domain.id, 'renewal_success', {
          domainName: domain.name,
        })
        break
      case 'failed':
        failed++
        await sendNotification(domain.userId, domain.id, 'renewal_failed', {
          domainName: domain.name,
          error: result.error,
        })
        break
      case 'skipped':
        skipped++
        break
    }
  }

  logger.info({ succeeded, failed, skipped }, 'Auto renewal completed')

  return {
    processed: domainsToRenew.length,
    succeeded,
    failed,
    skipped,
    results,
  }
}

let renewalTask: ReturnType<typeof cron.schedule> | undefined
let currentCronExpression: string = '0 2 * * *'

export function startAutoRenewalScheduler(cronExpression: string = '0 2 * * *') {
  stopAutoRenewalScheduler()

  currentCronExpression = cronExpression

  executeAutoRenewal().catch((err) => {
    logger.error({ err }, 'Auto renewal execution failed')
  })

  logger.info({ cronExpression }, 'Setting up scheduled renewal task')

  renewalTask = cron.schedule(cronExpression, () => {
    executeAutoRenewal().catch((err) => {
      logger.error({ err }, 'Scheduled renewal execution failed')
    })
  })

  logger.info({ cronExpression }, 'Auto renewal scheduler started')
}

export function updateAutoRenewalSchedule(cronExpression: string) {
  if (cronExpression === currentCronExpression) {
    return
  }

  startAutoRenewalScheduler(cronExpression)
}

export function stopAutoRenewalScheduler() {
  if (renewalTask) {
    renewalTask.stop()
    renewalTask = undefined
    currentCronExpression = ''
    logger.info('Auto renewal scheduler stopped')
  }
}

export function getCurrentCronExpression(): string {
  return currentCronExpression
}
