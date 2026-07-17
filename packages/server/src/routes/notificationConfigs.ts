import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { logger } from '@/utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '@/utils/response.js'
import { authMiddleware } from '../middleware/index.js'
import {
  getUserNotificationConfig,
  getUserNotificationConfigs,
  resetUserNotificationConfig,
  updateUserNotificationConfig,
} from '../services/notificationConfigService.js'

const router = Router()

const configTypeSchema = z.enum(['expiry_reminder', 'renewal_success', 'renewal_failed', 'sync_completed'])

const updateConfigSchema = z.object({
  enabled: z.boolean().optional(),
  expiryDays: z.number().int().positive().nullable().optional(),
})

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const configs = await getUserNotificationConfigs(req.userId!)
    return sendSuccess(res, configs)
  }
  catch (error) {
    logger.error({ error }, 'Get notification configs error')
    return sendError(res, '获取通知配置失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.get('/:type', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const typeParse = configTypeSchema.safeParse(req.params.type)
    if (!typeParse.success) {
      return sendError(res, '无效的通知类型', 1, HTTP_STATUS.BAD_REQUEST)
    }
    const config = await getUserNotificationConfig(req.userId!, typeParse.data)
    return sendSuccess(res, config)
  }
  catch (error) {
    logger.error({ error }, 'Get notification config error')
    return sendError(res, '获取通知配置失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.put('/:type', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const typeParse = configTypeSchema.safeParse(req.params.type)
    if (!typeParse.success) {
      return sendError(res, '无效的通知类型', 1, HTTP_STATUS.BAD_REQUEST)
    }
    const data = updateConfigSchema.parse(req.body)
    const config = await updateUserNotificationConfig(req.userId!, typeParse.data, data)
    logger.info({ userId: req.userId, type: typeParse.data }, 'Notification config updated')
    return sendSuccess(res, config, '更新成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Update notification config error')
    return sendError(res, '更新通知配置失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.delete('/:type', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const typeParse = configTypeSchema.safeParse(req.params.type)
    if (!typeParse.success) {
      return sendError(res, '无效的通知类型', 1, HTTP_STATUS.BAD_REQUEST)
    }
    await resetUserNotificationConfig(req.userId!, typeParse.data)
    logger.info({ userId: req.userId, type: typeParse.data }, 'Notification config reset')
    return sendSuccess(res, null, '已重置为默认值')
  }
  catch (error) {
    logger.error({ error }, 'Reset notification config error')
    return sendError(res, '重置通知配置失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
