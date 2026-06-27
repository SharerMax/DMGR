import type { PaginatedRenewalLogs, RenewalLogFilters } from '../models/renewalLog.js'
import cron from 'node-cron'
import { getDomainsByUserId } from '../models/domain.js'
import {
  getRecentRenewalLogs,
  getRenewalLogById,
  getRenewalLogs,
  getRenewalStats,

} from '../models/renewalLog.js'
import { executeAutoRenewal, getCurrentCronExpression, stopAutoRenewalScheduler, updateAutoRenewalSchedule } from './autoRenewService.js'

export interface RenewalLogQuery extends RenewalLogFilters {
  page: number
  pageSize: number
}

export interface AutoRenewConfig {
  enabled: boolean
  triggerMode: 'manual' | 'scheduled'
  cronExpression: string
}

export interface RenewalSummaryResult {
  summary: {
    total: number
    completed: number
    failed: number
    pending: number
    skipped: number
    successRate: number
  }
  recentLogs: any[]
}

export async function getUserRenewalLogs(
  userId: number,
  query: RenewalLogQuery,
): Promise<PaginatedRenewalLogs> {
  return getRenewalLogs({ ...query, userId }, query.page, query.pageSize)
}

export async function getUserRenewalLog(userId: number, logId: number) {
  const log = await getRenewalLogById(logId)
  if (!log) {
    return null
  }
  if (log.domain.userId !== userId) {
    return null
  }
  return log
}

export async function getUserRenewalSummary(userId: number): Promise<RenewalSummaryResult> {
  const userDomains = await getDomainsByUserId(userId)
  const domainIds = userDomains.map(d => d.id)

  const [summary, recentLogs] = await Promise.all([
    getRenewalStats(domainIds),
    getRecentRenewalLogs(domainIds),
  ])

  return { summary, recentLogs }
}

export function getAutoRenewConfig(): AutoRenewConfig {
  const cronExpression = getCurrentCronExpression()
  return {
    enabled: cronExpression !== '',
    triggerMode: cronExpression ? 'scheduled' : 'manual',
    cronExpression: cronExpression || '0 0 2 * * ?',
  }
}

export function updateAutoRenewConfig(config: {
  enabled: boolean
  triggerMode: 'manual' | 'scheduled'
  cronExpression?: string
}): AutoRenewConfig {
  if (!config.enabled) {
    stopAutoRenewalScheduler()
  }
  else if (config.triggerMode === 'manual') {
    stopAutoRenewalScheduler()
  }
  else if (config.triggerMode === 'scheduled' && config.cronExpression) {
    if (!cron.validate(config.cronExpression)) {
      throw new Error('无效的 cron 表达式')
    }
    updateAutoRenewalSchedule(config.cronExpression)
  }

  return getAutoRenewConfig()
}

export function triggerManualRenewal(): void {
  executeAutoRenewal().catch(() => {
    // 错误已在 autoRenew 服务中记录
  })
}
