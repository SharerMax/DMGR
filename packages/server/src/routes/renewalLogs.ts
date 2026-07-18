import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/index.js'
import {
  getAutoRenewConfig,
  getUserRenewalLog,
  getUserRenewalLogs,
  getUserRenewalSummary,
  triggerManualRenewal,
  updateAutoRenewConfig,
} from '../services/renewalLogService.js'
import { logger } from '../utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const querySchema = z.object({
  domainId: z.string().optional(),
  domainName: z.string().optional(),
  providerId: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional().transform(v => v ? Number.parseInt(v, 10) : 1),
  pageSize: z.string().optional().transform(v => v ? Number.parseInt(v, 10) : 20),
})

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const query = querySchema.parse(req.query)
    const result = await getUserRenewalLogs(req.userId!, {
      domainId: query.domainId ? Number.parseInt(query.domainId, 10) : undefined,
      domainName: query.domainName,
      providerId: query.providerId ? Number.parseInt(query.providerId, 10) : undefined,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      pageSize: query.pageSize,
    })
    return sendSuccess(res, result)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Get renewal logs error')
    return sendError(res, '获取续期日志失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.get('/stats/summary', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await getUserRenewalSummary(req.userId!)
    return sendSuccess(res, result)
  }
  catch (error) {
    logger.error({ error }, 'Get renewal stats error')
    return sendError(res, '获取续期统计失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

const autoRenewConfigSchema = z.object({
  enabled: z.boolean(),
  triggerMode: z.enum(['manual', 'scheduled']),
  cronExpression: z.string().optional(),
})

router.get('/config', authMiddleware, async (_req: AuthRequest, res) => {
  try {
    const config = getAutoRenewConfig()
    return sendSuccess(res, config)
  }
  catch (error) {
    logger.error({ error }, 'Get auto-renew config error')
    return sendError(res, '获取自动续期配置失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.put('/config', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const config = autoRenewConfigSchema.parse(req.body)
    const updated = updateAutoRenewConfig(config)
    logger.info({ config }, 'Auto-renew config updated')
    return sendSuccess(res, { config: updated }, '配置已更新')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    if (error instanceof Error && error.message === '无效的 cron 表达式') {
      return sendError(res, error.message, 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Update auto-renew config error')
    return sendError(res, '更新自动续期配置失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.post('/trigger', authMiddleware, async (_req: AuthRequest, res) => {
  try {
    triggerManualRenewal()
    return sendSuccess(res, undefined, '续期任务已触发')
  }
  catch (error) {
    logger.error({ error }, 'Trigger renewal error')
    return sendError(res, '触发续期任务失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const numericId = Number.parseInt(id, 10)
    if (Number.isNaN(numericId)) {
      return sendError(res, '无效的ID', 1, HTTP_STATUS.BAD_REQUEST)
    }
    const log = await getUserRenewalLog(req.userId!, numericId)
    if (!log) {
      return sendError(res, '续期日志不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    return sendSuccess(res, log)
  }
  catch (error) {
    logger.error({ error }, 'Get renewal log error')
    return sendError(res, '获取续期日志详情失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
