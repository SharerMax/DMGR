import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import {
  createDomain,
  deleteDomain,
  getDomainById,
  getDomainsByUserId,
  getExpiringDomains,
  updateDomain,
} from '../models/domain.js'
import {
  createReminder,
  deleteRemindersByDomainId,
  getRemindersByDomainId,
} from '../models/reminder.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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

const domainSchema = z.object({
  name: z.string().min(1).max(255),
  providerId: z.number().optional().nullable(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  autoRenew: z.boolean().optional(),
  renewalPrice: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const reminderSchema = z.object({
  daysBefore: z.number().positive(),
})

// 获取所有域名
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const domains = await getDomainsByUserId(req.userId)
    // 为每个域名获取提醒设置
    const domainsWithReminders = await Promise.all(
      domains.map(async domain => ({
        ...domain,
        provider_name: domain.provider?.name,
        reminders: await getRemindersByDomainId(domain.id),
      })),
    )
    res.json(domainsWithReminders)
  }
  catch (error) {
    console.error('Get domains error:', error)
    res.status(500).json({ error: '获取域名列表失败' })
  }
})

// 获取即将过期的域名
router.get('/expiring', authMiddleware, async (req: any, res) => {
  try {
    const days = Number(req.query.days) || 30
    const domains = await getExpiringDomains(days)
    // 只返回当前用户的域名
    const userDomains = domains.filter(d => d.userId === req.userId)
    res.json(userDomains)
  }
  catch (error) {
    console.error('Get expiring domains error:', error)
    res.status(500).json({ error: '获取即将过期域名失败' })
  }
})

// 获取单个域名
router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const domain = await getDomainById(Number(req.params.id))
    if (!domain || domain.userId !== req.userId) {
      return res.status(404).json({ error: '域名不存在' })
    }
    const reminders = await getRemindersByDomainId(domain.id)
    res.json({ ...domain, reminders })
  }
  catch (error) {
    console.error('Get domain error:', error)
    res.status(500).json({ error: '获取域名失败' })
  }
})

// 创建域名
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const data = domainSchema.parse(req.body)
    const domain = await createDomain({
      ...data,
      userId: req.userId,
    })
    res.status(201).json(domain)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }
    console.error('Create domain error:', error)
    res.status(500).json({ error: '创建域名失败' })
  }
})

// 更新域名
router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const domain = await getDomainById(Number(req.params.id))
    if (!domain || domain.userId !== req.userId) {
      return res.status(404).json({ error: '域名不存在' })
    }

    const data = domainSchema.partial().parse(req.body)
    const updated = await updateDomain(Number(req.params.id), data)
    res.json(updated)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }
    console.error('Update domain error:', error)
    res.status(500).json({ error: '更新域名失败' })
  }
})

// 删除域名
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const domain = await getDomainById(Number(req.params.id))
    if (!domain || domain.userId !== req.userId) {
      return res.status(404).json({ error: '域名不存在' })
    }

    // 删除关联的提醒
    await deleteRemindersByDomainId(domain.id)
    await deleteDomain(Number(req.params.id))
    res.status(204).send()
  }
  catch (error) {
    console.error('Delete domain error:', error)
    res.status(500).json({ error: '删除域名失败' })
  }
})

// 添加提醒
router.post('/:id/reminders', authMiddleware, async (req: any, res) => {
  try {
    const domain = await getDomainById(Number(req.params.id))
    if (!domain || domain.userId !== req.userId) {
      return res.status(404).json({ error: '域名不存在' })
    }

    const data = reminderSchema.parse(req.body)
    const reminder = await createReminder({
      domainId: domain.id,
      daysBefore: data.daysBefore,
    })
    res.status(201).json(reminder)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }
    console.error('Create reminder error:', error)
    res.status(500).json({ error: '创建提醒失败' })
  }
})

export default router
