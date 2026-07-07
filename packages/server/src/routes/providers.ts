import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/index.js'
import {
  createUserProvider,
  deleteUserProvider,
  getSupportedProviderTypes,
  getUserProvider,
  getUserProviders,
  syncProviderDomains,
  updateUserProvider,
} from '../services/providerService.js'
import { logger } from '../utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const providerSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1).max(100),
  config: z.record(z.string(), z.unknown()),
  supportsAutoRenew: z.boolean().optional(),
})

router.get('/types', (_req, res) => {
  const types = getSupportedProviderTypes()
  return sendSuccess(res, types)
})

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const providers = await getUserProviders(req.userId!)
    return sendSuccess(res, providers)
  }
  catch (error) {
    logger.error({ error }, 'Get providers error')
    return sendError(res, '获取服务商列表失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const provider = await getUserProvider(req.userId!, Number(req.params.id))
    if (!provider) {
      return sendError(res, '服务商不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    return sendSuccess(res, provider)
  }
  catch (error) {
    logger.error({ error }, 'Get provider error')
    return sendError(res, '获取服务商失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = providerSchema.parse(req.body)
    const provider = await createUserProvider(req.userId!, {
      type: data.type,
      name: data.name,
      config: data.config as Record<string, string>,
      supportsAutoRenew: data.supportsAutoRenew,
    })
    logger.info({ providerId: provider.id, type: provider.type }, 'Provider created')
    return sendSuccess(res, provider, '服务商创建成功', HTTP_STATUS.CREATED)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    if (error instanceof Error && error.message.startsWith('缺少必填字段')) {
      return sendError(res, error.message, 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Create provider error')
    return sendError(res, '创建服务商失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = providerSchema.partial().parse(req.body)
    const updated = await updateUserProvider(req.userId!, Number(req.params.id), {
      ...data,
      config: data.config ? data.config as Record<string, string> : undefined,
    })
    if (!updated) {
      return sendError(res, '服务商不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    logger.info({ providerId: updated.id }, 'Provider updated')
    return sendSuccess(res, updated, '服务商更新成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    if (error instanceof Error && error.message === '不支持的服务商类型') {
      return sendError(res, error.message, 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Update provider error')
    return sendError(res, '更新服务商失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const success = await deleteUserProvider(req.userId!, Number(req.params.id))
    if (!success) {
      return sendError(res, '服务商不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    logger.info({ providerId: Number(req.params.id) }, 'Provider deleted')
    return res.status(HTTP_STATUS.NO_CONTENT).send()
  }
  catch (error) {
    logger.error({ error }, 'Delete provider error')
    return sendError(res, '删除服务商失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.post('/:id/sync', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await syncProviderDomains(req.userId!, Number(req.params.id))
    logger.info({
      providerId: Number(req.params.id),
      syncedCount: result.syncedCount,
      dnsRecordsInserted: result.dnsRecordsInserted,
      dnsRecordsDeleted: result.dnsRecordsDeleted,
    }, 'Domains synced')
    return sendSuccess(res, result, '同步成功')
  }
  catch (error) {
    if (error instanceof Error && error.message === '服务商不存在') {
      return sendError(res, error.message, 1, HTTP_STATUS.NOT_FOUND)
    }
    if (error instanceof Error && error.message !== '同步失败') {
      return sendError(res, error.message, 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Sync domains error')
    return sendError(res, '同步域名失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
