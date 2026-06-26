import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/index.js'
import {
  createNotificationChannel,
  deleteNotificationChannel,
  getNotificationChannelById,
  getNotificationChannelsByUserId,
  parseConfig,
  updateNotificationChannel,
} from '../models/notificationChannel.js'
import { logger } from '../utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const channelSchema = z.object({
  type: z.enum(['email', 'sms', 'webhook']),
  name: z.string().min(1).max(100),
  config: z.record(z.string(), z.any()),
  defaultDays: z.number().positive().optional(),
  isActive: z.boolean().optional(),
})

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const channels = await getNotificationChannelsByUserId(req.userId!)
    const channelsWithConfig = channels.map(channel => ({
      ...channel,
      config: parseConfig(channel.config),
    }))
    return sendSuccess(res, channelsWithConfig)
  }
  catch (error) {
    logger.error({ error }, 'Get channels error')
    return sendError(res, '获取通知渠道失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const channel = await getNotificationChannelById(Number(req.params.id))
    if (!channel || channel.userId !== req.userId) {
      return sendError(res, '通知渠道不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    return sendSuccess(res, { ...channel, config: parseConfig(channel.config) })
  }
  catch (error) {
    logger.error({ error }, 'Get channel error')
    return sendError(res, '获取通知渠道失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = channelSchema.parse(req.body)
    const channel = await createNotificationChannel({
      ...data,
      userId: req.userId!,
    })

    logger.info({ channelId: channel.id, type: channel.type }, 'Notification channel created')

    return sendSuccess(res, { ...channel, config: data.config }, '创建成功', HTTP_STATUS.CREATED)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Create channel error')
    return sendError(res, '创建通知渠道失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const channel = await getNotificationChannelById(Number(req.params.id))
    if (!channel || channel.userId !== req.userId) {
      return sendError(res, '通知渠道不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    const data = channelSchema.partial().parse(req.body)
    const updated = await updateNotificationChannel(Number(req.params.id), data)

    logger.info({ channelId: updated!.id }, 'Notification channel updated')

    return sendSuccess(res, { ...updated, config: parseConfig(updated!.config) }, '更新成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Update channel error')
    return sendError(res, '更新通知渠道失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const channel = await getNotificationChannelById(Number(req.params.id))
    if (!channel || channel.userId !== req.userId) {
      return sendError(res, '通知渠道不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    await deleteNotificationChannel(Number(req.params.id))

    logger.info({ channelId: channel.id }, 'Notification channel deleted')

    return res.status(HTTP_STATUS.NO_CONTENT).send()
  }
  catch (error) {
    logger.error({ error }, 'Delete channel error')
    return sendError(res, '删除通知渠道失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
