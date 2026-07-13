import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/index.js'
import { getUserSyncLog, getUserSyncLogs } from '../services/syncLogService.js'
import { logger } from '../utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const querySchema = z.object({
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
    const result = await getUserSyncLogs(req.userId!, {
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
    logger.error({ error }, 'Get sync logs error')
    return sendError(res, '获取同步日志失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const numericId = Number.parseInt(id, 10)
    if (Number.isNaN(numericId)) {
      return sendError(res, '无效的ID', 1, HTTP_STATUS.BAD_REQUEST)
    }
    const log = await getUserSyncLog(req.userId!, numericId)
    if (!log) {
      return sendError(res, '同步日志不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    return sendSuccess(res, log)
  }
  catch (error) {
    logger.error({ error }, 'Get sync log error')
    return sendError(res, '获取同步日志详情失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
