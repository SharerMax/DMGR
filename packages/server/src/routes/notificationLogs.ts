import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/index.js'
import { getUserNotificationLog, getUserNotificationLogs } from '../services/notificationLogService.js'
import { logger } from '../utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const querySchema = z.object({
  type: z.string().optional(),
  channel: z.string().optional(),
  domainId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional().transform(v => v ? Number.parseInt(v, 10) : 1),
  pageSize: z.string().optional().transform(v => v ? Number.parseInt(v, 10) : 20),
})

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const query = querySchema.parse(req.query)
    const result = await getUserNotificationLogs(req.userId!, {
      type: query.type,
      channel: query.channel,
      domainId: query.domainId ? Number.parseInt(query.domainId, 10) : undefined,
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
    logger.error({ error }, 'Get notification logs error')
    return sendError(res, '获取通知日志失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const numericId = Number.parseInt(id, 10)
    if (Number.isNaN(numericId)) {
      return sendError(res, '无效的ID', 1, HTTP_STATUS.BAD_REQUEST)
    }
    const log = await getUserNotificationLog(req.userId!, numericId)
    if (!log) {
      return sendError(res, '通知日志不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    return sendSuccess(res, log)
  }
  catch (error) {
    logger.error({ error }, 'Get notification log error')
    return sendError(res, '获取通知日志详情失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
