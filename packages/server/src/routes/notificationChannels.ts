import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import {
  createNotificationChannel,
  deleteNotificationChannel,
  getNotificationChannelById,
  getNotificationChannelsByUserId,
  parseConfig,
  updateNotificationChannel,
} from '../models/notificationChannel.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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

const channelSchema = z.object({
  type: z.enum(['email', 'sms', 'webhook']),
  name: z.string().min(1).max(100),
  config: z.record(z.string(), z.any()),
  defaultDays: z.number().positive().optional(),
  isActive: z.boolean().optional(),
})

router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const channels = await getNotificationChannelsByUserId(req.userId)
    const channelsWithConfig = channels.map(channel => ({
      ...channel,
      config: parseConfig(channel.config),
    }))
    res.json(channelsWithConfig)
  }
  catch (error) {
    console.error('Get channels error:', error)
    res.status(500).json({ error: '获取通知渠道失败' })
  }
})

router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const channel = await getNotificationChannelById(Number(req.params.id))
    if (!channel || channel.userId !== req.userId) {
      return res.status(404).json({ error: '通知渠道不存在' })
    }
    res.json({ ...channel, config: parseConfig(channel.config) })
  }
  catch (error) {
    console.error('Get channel error:', error)
    res.status(500).json({ error: '获取通知渠道失败' })
  }
})

router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const data = channelSchema.parse(req.body)
    const channel = await createNotificationChannel({
      ...data,
      userId: req.userId,
    })
    res.status(201).json({ ...channel, config: data.config })
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }
    console.error('Create channel error:', error)
    res.status(500).json({ error: '创建通知渠道失败' })
  }
})

router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const channel = await getNotificationChannelById(Number(req.params.id))
    if (!channel || channel.userId !== req.userId) {
      return res.status(404).json({ error: '通知渠道不存在' })
    }

    const data = channelSchema.partial().parse(req.body)
    const updated = await updateNotificationChannel(Number(req.params.id), data)
    res.json({ ...updated, config: parseConfig(updated!.config) })
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }
    console.error('Update channel error:', error)
    res.status(500).json({ error: '更新通知渠道失败' })
  }
})

router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const channel = await getNotificationChannelById(Number(req.params.id))
    if (!channel || channel.userId !== req.userId) {
      return res.status(404).json({ error: '通知渠道不存在' })
    }

    await deleteNotificationChannel(Number(req.params.id))
    res.status(204).send()
  }
  catch (error) {
    console.error('Delete channel error:', error)
    res.status(500).json({ error: '删除通知渠道失败' })
  }
})

export default router
