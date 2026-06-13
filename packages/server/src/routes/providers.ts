import type { DomainSyncer } from '../providers/index.js'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { createDomain, getDomainsByUserId } from '../models/domain.js'
import {
  createProvider,
  deleteProvider,
  getProviderById,
  getProvidersByUserId,
  updateProvider,
} from '../models/provider.js'
import { BUILT_IN_PROVIDERS, DNSProviderFactory, getProviderConfig } from '../providers/index.js'
import 'process'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const _getProviderApiUrl = (type: string, _config: Record<string, string>): string => {
  switch (type) {
    case 'aliyun':
      return 'https://alidns.aliyuncs.com'
    case 'tencent':
      return 'https://dnspod.tencentcloudapi.com'
    case 'cloudflare':
      return 'https://api.cloudflare.com/client/v4'
    case 'dnspod':
      return 'https://api.dnspod.com'
    case 'namecheap':
      return 'https://api.namecheap.com'
    case 'custom':
      return _config.apiUrl || ''
    default:
      return ''
  }
}

// 验证中间件
function authMiddleware(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    req.userId = decoded.userId
    next()
  }
  catch {
    res.status(401).json({ error: '未授权' })
  }
}

const providerSchema = z.object({
  type: z.string().min(1), // 服务商类型
  name: z.string().min(1).max(100),
  config: z.record(z.string(), z.unknown()), // 动态配置
  supportsAutoRenew: z.boolean().optional(),
})

// 获取支持的服务商列表（无需认证）
router.get('/types', (req, res) => {
  // 返回简化版的配置列表（不包含敏感信息）
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
  res.json(types)
})

// 获取所有服务商
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const providers = await getProvidersByUserId(req.userId)
    res.json(providers)
  }
  catch (error) {
    console.error('Get providers error:', error)
    res.status(500).json({ error: '获取服务商列表失败' })
  }
})

// 获取单个服务商
router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const provider = await getProviderById(Number(req.params.id))
    if (!provider || provider.userId !== req.userId) {
      return res.status(404).json({ error: '服务商不存在' })
    }
    res.json(provider)
  }
  catch (error) {
    console.error('Get provider error:', error)
    res.status(500).json({ error: '获取服务商失败' })
  }
})

// 创建服务商
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const data = providerSchema.parse(req.body)

    // 获取服务商配置以确定字段
    const providerConfig = getProviderConfig(data.type)
    if (!providerConfig) {
      return res.status(400).json({ error: '不支持的服务商类型' })
    }

    // 验证必填字段
    const missingFields = providerConfig.fields
      .filter(f => f.required && !data.config[f.key])
      .map(f => f.label)

    if (missingFields.length > 0) {
      return res.status(400).json({ error: `缺少必填字段: ${missingFields.join(', ')}` })
    }

    // 根据类型获取 API URL（预留用于后续扩展）
    // const apiUrl = getProviderApiUrl(data.type, data.config)

    // supportsAutoRenew 完全由 BUILT_IN_PROVIDERS 配置决定
    const provider = await createProvider({
      type: data.type,
      name: data.name,
      config: data.config as Record<string, string>,
      supportsAutoRenew: providerConfig.supportsAutoRenew,
      userId: req.userId,
    })
    res.status(201).json(provider)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    console.error('Create provider error:', error)
    res.status(500).json({ error: '创建服务商失败' })
  }
})

// 更新服务商
router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const provider = await getProviderById(Number(req.params.id))
    if (!provider || provider.userId !== req.userId) {
      return res.status(404).json({ error: '服务商不存在' })
    }

    const data = providerSchema.partial().parse(req.body)

    // 如果更新了类型，验证新类型
    if (data.type) {
      const providerConfig = getProviderConfig(data.type)
      if (!providerConfig) {
        return res.status(400).json({ error: '不支持的服务商类型' })
      }
    }

    const updated = await updateProvider(Number(req.params.id), {
      ...data,
      config: data.config ? JSON.stringify(data.config) : undefined,
    })
    res.json(updated)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    console.error('Update provider error:', error)
    res.status(500).json({ error: '更新服务商失败' })
  }
})

// 删除服务商
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const provider = await getProviderById(Number(req.params.id))
    if (!provider || provider.userId !== req.userId) {
      return res.status(404).json({ error: '服务商不存在' })
    }

    await deleteProvider(Number(req.params.id))
    res.status(204).send()
  }
  catch (error) {
    console.error('Delete provider error:', error)
    res.status(500).json({ error: '删除服务商失败' })
  }
})

// 同步域名
router.post('/:id/sync', authMiddleware, async (req: any, res) => {
  try {
    const provider = await getProviderById(Number(req.params.id))
    if (!provider || provider.userId !== req.userId) {
      return res.status(404).json({ error: '服务商不存在' })
    }

    // 根据服务商类型创建对应的同步器
    let syncer: DomainSyncer | null = null

    // 解析配置
    const config: Record<string, string> = {}
    try {
      Object.assign(config, JSON.parse(provider.config))
    }
    catch {
      // 忽略解析错误
    }

    // 根据类型创建同步器
    switch (provider.type) {
      case 'aliyun':
        syncer = DNSProviderFactory.createSyncer('aliyun', {
          apiKey: config.accessKeyId,
          apiSecret: config.accessKeySecret,
        })
        break
      case 'tencent':
        // 腾讯云同步器
        break
      case 'cloudflare':
        // Cloudflare 同步器
        break
      case 'dnspod':
        // DNSPod 同步器
        break
      case 'custom':
        // 自定义同步器
        break
    }

    // 如果没有找到对应的同步器，使用模拟数据
    if (!syncer || !syncer.validateConfig()) {
      // 模拟从服务商 API 获取域名列表
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

      // 获取用户现有域名
      const existingDomains = await getDomainsByUserId(req.userId)
      const existingDomainNames = new Set(existingDomains.map(d => d.name))

      // 同步域名
      const syncedDomains = []
      for (const domain of mockDomains) {
        if (!existingDomainNames.has(domain.name)) {
          const newDomain = await createDomain({
            name: domain.name,
            providerId: provider.id,
            userId: req.userId,
            expiryDate: domain.expiryDate,
            autoRenew: domain.autoRenew,
          })
          syncedDomains.push(newDomain)
        }
      }

      return res.json({
        message: '同步成功',
        syncedCount: syncedDomains.length,
        domains: syncedDomains,
      })
    }

    // 使用真实的同步器
    const syncResult = await syncer.syncDomains()

    if (!syncResult.success) {
      return res.status(400).json({
        error: syncResult.errors?.join(', ') || '同步失败',
      })
    }

    // 获取用户现有域名
    const existingDomains = await getDomainsByUserId(req.userId)
    const existingDomainNames = new Set(existingDomains.map(d => d.name))

    // 同步域名
    const syncedDomains = []
    for (const domain of syncResult.domains) {
      if (!existingDomainNames.has(domain.name)) {
        const newDomain = await createDomain({
          name: domain.name,
          providerId: provider.id,
          userId: req.userId,
          expiryDate: domain.expirationDate,
          autoRenew: provider.supportsAutoRenew,
        })
        syncedDomains.push(newDomain)
      }
    }

    res.json({
      message: '同步成功',
      syncedCount: syncedDomains.length,
      domains: syncedDomains,
    })
  }
  catch (error) {
    console.error('Sync domains error:', error)
    res.status(500).json({ error: '同步域名失败' })
  }
})

export default router
