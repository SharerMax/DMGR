import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { logger } from '@/utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '@/utils/response.js'
import { authMiddleware } from '../middleware/index.js'
import { getDashboardData } from '../services/dashboardService.js'

const router = Router()

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = await getDashboardData(req.userId!)
    return sendSuccess(res, data)
  }
  catch (error) {
    logger.error({ error }, 'Get dashboard data error')
    return sendError(res, '获取概览数据失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
