/**
 * 自动续期服务
 * 定期检查需要续期的域名并自动执行续期
 */

import { differenceInDays } from 'date-fns'
import { prisma } from '../db/index.js'
import { getProviderConfig } from '../providers/base.js'
import { sendNotification } from './notification.js'

// 续期状态
export type RenewalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'

// 续期结果
export interface RenewalResult {
  domainId: number
  domainName: string
  status: RenewalStatus
  message?: string
  error?: string
  renewedAt?: Date
}

// 续期执行器接口
export interface RenewalExecutor {
  renew: (domainName: string, config: Record<string, string>) => Promise<{ success: boolean, error?: string }>
}

// 续期记录操作
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

// 获取需要续期的域名列表
export async function getDomainsNeedingRenewal(): Promise<Array<{
  domain: {
    id: number
    name: string
    userId: number
    expiryDate: Date
    autoRenew: boolean
    autoRenewDays: number | null
  }
  provider: {
    id: number
    type: string
    config: Record<string, string>
    supportsAutoRenew: boolean
  } | null
}>> {
  const now = new Date()

  // 查询所有开启自动续期且未过期的域名
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

  // 过滤出需要续期的域名
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
            supportsAutoRenew: domain.provider.supportsAutoRenew,
          }
        : null,
    }))
    .filter(({ domain, provider }) => {
      // 检查是否到达续期触发时间
      const daysUntilExpiry = differenceInDays(domain.expiryDate, now)
      const triggerDays = domain.autoRenewDays || 30 // 默认 30 天

      // 服务商必须支持自动续期
      if (!provider?.supportsAutoRenew) {
        return false
      }

      // 检查是否在可续期范围内
      const providerConfig = getProviderConfig(provider.type)
      if (providerConfig && providerConfig.maxRenewalDays) {
        if (daysUntilExpiry > providerConfig.maxRenewalDays) {
          return false // 还未到可续期时间
        }
      }

      // 检查是否到达触发阈值
      return daysUntilExpiry <= triggerDays
    })
}

// 执行单个域名续期
export async function renewDomain(
  domainId: number,
  domainName: string,
  providerType: string,
  config: Record<string, string>,
): Promise<RenewalResult> {
  // 检查今天是否已经尝试过续期
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

  // 获取续期执行器
  const executor = getRenewalExecutor(providerType)
  if (!executor) {
    const error = `不支持的服务商类型: ${providerType}`
    await createRenewalLog(domainId, 'failed', undefined, error)
    return {
      domainId,
      domainName,
      status: 'failed',
      error,
    }
  }

  try {
    // 执行续期
    const result = await executor.renew(domainName, config)

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

// 获取续期执行器
function getRenewalExecutor(providerType: string): RenewalExecutor | null {
  // 导入各服务商的续期实现
  const executors: Record<string, RenewalExecutor> = {
    aliyun: createAliyunRenewalExecutor(),
    tencent: createTencentRenewalExecutor(),
    // 其他服务商...
  }

  return executors[providerType] || null
}

// 阿里云续期执行器
function createAliyunRenewalExecutor(): RenewalExecutor {
  return {
    async renew(domainName: string, config: Record<string, string>): Promise<{ success: boolean, error?: string }> {
      const accessKeyId = config.accessKeyId
      const accessKeySecret = config.accessKeySecret

      if (!accessKeyId || !accessKeySecret) {
        return { success: false, error: '缺少阿里云 API 凭证' }
      }

      // 实际实现需要调用阿里云域名续期 API
      // 这里暂时返回模拟结果
      console.warn(`[AutoRenew] 阿里云续期 API 未实现，模拟续期成功: ${domainName}`)

      // 实际 API 调用示例：
      // const result = await aliyunRenewDomain(accessKeyId, accessKeySecret, domainName)
      // return { success: result.Success, error: result.Message }

      return { success: true }
    },
  }
}

// 腾讯云续期执行器
function createTencentRenewalExecutor(): RenewalExecutor {
  return {
    async renew(domainName: string, config: Record<string, string>): Promise<{ success: boolean, error?: string }> {
      const secretId = config.secretId
      const secretKey = config.secretKey

      if (!secretId || !secretKey) {
        return { success: false, error: '缺少腾讯云 API 凭证' }
      }

      // 实际实现需要调用腾讯云域名续期 API
      console.warn(`[AutoRenew] 腾讯云续期 API 未实现，模拟续期成功: ${domainName}`)

      return { success: true }
    },
  }
}

// 批量执行续期
export async function executeAutoRenewal(): Promise<{
  processed: number
  succeeded: number
  failed: number
  skipped: number
  results: RenewalResult[]
}> {
  console.log('[AutoRenew] 开始执行自动续期检查...')

  const domainsToRenew = await getDomainsNeedingRenewal()
  console.log(`[AutoRenew] 发现 ${domainsToRenew.length} 个域名需要续期`)

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
        // 发送成功通知
        await sendNotification(domain.userId, domain.id, 'renewal_success', {
          domainName: domain.name,
        })
        break
      case 'failed':
        failed++
        // 发送失败通知
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

  console.log(`[AutoRenew] 续期完成: 成功 ${succeeded}, 失败 ${failed}, 跳过 ${skipped}`)

  return {
    processed: domainsToRenew.length,
    succeeded,
    failed,
    skipped,
    results,
  }
}

// 启动定时任务
let renewalIntervalId: NodeJS.Timeout | null = null

export function startAutoRenewalScheduler(intervalHours: number = 24) {
  // 检查间隔（默认 24 小时）
  const intervalMs = intervalHours * 60 * 60 * 1000

  // 立即执行一次
  executeAutoRenewal().catch((err) => {
    console.error('[AutoRenew] 自动续期执行失败:', err)
  })

  // 设置定时任务
  renewalIntervalId = setInterval(() => {
    executeAutoRenewal().catch((err) => {
      console.error('[AutoRenew] 自动续期执行失败:', err)
    })
  }, intervalMs)

  console.log(`[AutoRenew] 自动续期定时任务已启动，每 ${intervalHours} 小时执行一次`)
}

export function stopAutoRenewalScheduler() {
  if (renewalIntervalId) {
    clearInterval(renewalIntervalId)
    renewalIntervalId = null
    console.log('[AutoRenew] 自动续期定时任务已停止')
  }
}
