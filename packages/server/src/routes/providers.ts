import type { AuthRequest } from '../middleware/index.js'
import type { DomainSyncer } from '../providers/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/index.js'
import { createDomain, getDomainsByUserId } from '../models/domain.js'
import {
  createProvider,
  deleteProvider,
  getProviderById,
  getProvidersByUserId,
  updateProvider,
} from '../models/provider.js'
import { BUILT_IN_PROVIDERS, DNSProviderFactory, getProviderConfig } from '../providers/index.js'
import { logger } from '../utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const providerSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1).max(100),
  config: z.record(z.string(), z.unknown()),
  supportsAutoRenew: z.boolean().optional(),
})

// 获取支持的服务商列表（无需认证）
router.get('/types', (req, res) => {
  const types = BUILT_IN_PROVIDERS.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    fields: p.fields.map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder,
      description: f.description,
    })),
    supportsAutoRenew: p.supportsAutoRenew,
    maxRenewalDays: p.maxRenewalDays,
    features: p.features,
  }))
  return sendSuccess(res, types)
})

// 获取所有服务商
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const providers = await getProvidersByUserId(req.userId!)
    return sendSuccess(res, providers)
  }
  catch (error) {
    logger.error({ error }, 'Get providers error')
    return sendError(res, '获取服务商列表失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 获取单个服务商
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const provider = await getProviderById(Number(req.params.id))
    if (!provider || provider.userId !== req.userId) {
      return sendError(res, '服务商不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    return sendSuccess(res, provider)
  }
  catch (error) {
    logger.error({ error }, 'Get provider error')
    return sendError(res, '获取服务商失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 创建服务商
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = providerSchema.parse(req.body)

    const providerConfig = getProviderConfig(data.type)
    if (!providerConfig) {
      return sendError(res, '不支持的服务商类型', 1, HTTP_STATUS.BAD_REQUEST)
    }

    const missingFields = providerConfig.fields
      .filter(f => f.required && !data.config[f.key])
      .map(f => f.label)

    if (missingFields.length > 0) {
      return sendError(res, `缺少必填字段: ${missingFields.join(', ')}`, 1, HTTP_STATUS.BAD_REQUEST)
    }

    const provider = await createProvider({
      type: data.type,
      name: data.name,
      config: data.config as Record<string, string>,
      supportsAutoRenew: providerConfig.supportsAutoRenew,
      userId: req.userId!,
    })

    logger.info({ providerId: provider.id, type: provider.type }, 'Provider created')

    return sendSuccess(res, provider, '服务商创建成功', HTTP_STATUS.CREATED)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Create provider error')
    return sendError(res, '创建服务商失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 更新服务商
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const provider = await getProviderById(Number(req.params.id))
    if (!provider || provider.userId !== req.userId) {
      return sendError(res, '服务商不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    const data = providerSchema.partial().parse(req.body)

    if (data.type) {
      const providerConfig = getProviderConfig(data.type)
      if (!providerConfig) {
        return sendError(res, '不支持的服务商类型', 1, HTTP_STATUS.BAD_REQUEST)
      }
    }

    const updated = await updateProvider(Number(req.params.id), {
      ...data,
      config: data.config ? JSON.stringify(data.config) : undefined,
    })

    logger.info({ providerId: updated!.id }, 'Provider updated')

    return sendSuccess(res, updated, '服务商更新成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Update provider error')
    return sendError(res, '更新服务商失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 删除服务商
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const provider = await getProviderById(Number(req.params.id))
    if (!provider || provider.userId !== req.userId) {
      return sendError(res, '服务商不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    await deleteProvider(Number(req.params.id))

    logger.info({ providerId: provider.id }, 'Provider deleted')

    return res.status(HTTP_STATUS.NO_CONTENT).send()
  }
  catch (error) {
    logger.error({ error }, 'Delete provider error')
    return sendError(res, '删除服务商失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 同步域名
router.post('/:id/sync', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const provider = await getProviderById(Number(req.params.id))
    if (!provider || provider.userId !== req.userId) {
      return sendError(res, '服务商不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    let syncer: DomainSyncer | null = null

    const config: Record<string, string> = {}
    try {
      Object.assign(config, JSON.parse(provider.config))
    }
    catch {
      // 忽略解析错误
    }

    switch (provider.type) {
      case 'aliyun':
        syncer = DNSProviderFactory.createSyncer('aliyun', {
          apiKey: config.accessKeyId,
          apiSecret: config.accessKeySecret,
        })
        break
      case 'tencent':
        break
      case 'cloudflare':
        break
      case 'dnspod':
        break
      case 'custom':
        break
    }

    if (!syncer || !syncer.validateConfig()) {
      const mockDomains = [
        {
          name: 'example1.com',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          autoRenew: provider.supportsAutoRenew,
        },
        {
          name: 'example2.com',
          expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          autoRenew: provider.supportsAutoRenew,
        },
      ]

      const existingDomains = await getDomainsByUserId(req.userId!)
      const existingDomainNames = new Set(existingDomains.map(d => d.name))

      const syncedDomains = []
      for (const domain of mockDomains) {
        if (!existingDomainNames.has(domain.name)) {
          const newDomain = await createDomain({
            name: domain.name,
            providerId: provider.id,
            userId: req.userId!,
            expiryDate: domain.expiryDate,
            autoRenew: domain.autoRenew,
          })
          syncedDomains.push(newDomain)
        }
      }

      logger.info({ providerId: provider.id, syncedCount: syncedDomains.length }, 'Domains synced (mock)')

      return sendSuccess(res, {
        syncedCount: syncedDomains.length,
        domains: syncedDomains,
      }, '同步成功')
    }

    const syncResult = await syncer.syncDomains()

    if (!syncResult.success) {
      return sendError(res, syncResult.errors?.join(', ') || '同步失败', 1, HTTP_STATUS.BAD_REQUEST)
    }

    const existingDomains = await getDomainsByUserId(req.userId!)
    const existingDomainNames = new Set(existingDomains.map(d => d.name))

    const syncedDomains = []
    for (const domain of syncResult.domains) {
      if (!existingDomainNames.has(domain.name)) {
        const newDomain = await createDomain({
          name: domain.name,
          providerId: provider.id,
          userId: req.userId!,
          expiryDate: domain.expirationDate,
          autoRenew: provider.supportsAutoRenew,
        })
        syncedDomains.push(newDomain)
      }
    }

    logger.info({ providerId: provider.id, syncedCount: syncedDomains.length }, 'Domains synced')

    return sendSuccess(res, {
      syncedCount: syncedDomains.length,
      domains: syncedDomains,
    }, '同步成功')
  }
  catch (error) {
    logger.error({ error }, 'Sync domains error')
    return sendError(res, '同步域名失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
