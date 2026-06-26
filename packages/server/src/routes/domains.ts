import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/index.js'
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
import { logger } from '../utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const domainSchema = z.object({
  name: z.string().min(1).max(255),
  providerId: z.number().optional().nullable(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  autoRenew: z.boolean().optional(),
  autoRenewDays: z.number().int().positive().optional().nullable(),
  renewalPrice: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const reminderSchema = z.object({
  daysBefore: z.number().positive(),
})

// 获取所有域名（支持过滤）
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { search, providerId } = req.query

    let domains = await getDomainsByUserId(req.userId!)

    // 应用过滤
    if (search) {
      const searchTerm = String(search).toLowerCase()
      domains = domains.filter(d => d.name.toLowerCase().includes(searchTerm))
    }

    if (providerId) {
      const providerIdNum = Number(providerId)
      domains = domains.filter(d => d.providerId === providerIdNum)
    }

    // 为每个域名获取提醒设置
    const domainsWithReminders = await Promise.all(
      domains.map(async domain => ({
        ...domain,
        provider_name: domain.provider?.name,
        reminders: await getRemindersByDomainId(domain.id),
      })),
    )

    return sendSuccess(res, domainsWithReminders)
  }
  catch (error) {
    logger.error({ error }, 'Get domains error')
    return sendError(res, '获取域名列表失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 获取即将过期的域名
router.get('/expiring', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const days = Number(req.query.days) || 30
    const domains = await getExpiringDomains(days)
    // 只返回当前用户的域名
    const userDomains = domains.filter(d => d.userId === req.userId)

    return sendSuccess(res, userDomains)
  }
  catch (error) {
    logger.error({ error }, 'Get expiring domains error')
    return sendError(res, '获取即将过期域名失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 获取单个域名
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const domain = await getDomainById(Number(req.params.id))
    if (!domain || domain.userId !== req.userId) {
      return sendError(res, '域名不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    const reminders = await getRemindersByDomainId(domain.id)

    return sendSuccess(res, { ...domain, reminders })
  }
  catch (error) {
    logger.error({ error }, 'Get domain error')
    return sendError(res, '获取域名失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 创建域名
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = domainSchema.parse(req.body)
    const domain = await createDomain({
      ...data,
      userId: req.userId!,
    })

    logger.info({ domainId: domain.id, name: domain.name }, 'Domain created')

    return sendSuccess(res, domain, '域名创建成功', HTTP_STATUS.CREATED)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Create domain error')
    return sendError(res, '创建域名失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 更新域名
router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const domain = await getDomainById(Number(req.params.id))
    if (!domain || domain.userId !== req.userId) {
      return sendError(res, '域名不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    const data = domainSchema.partial().parse(req.body)
    const updated = await updateDomain(Number(req.params.id), data)

    logger.info({ domainId: updated!.id }, 'Domain updated')

    return sendSuccess(res, updated, '域名更新成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Update domain error')
    return sendError(res, '更新域名失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 删除域名
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const domain = await getDomainById(Number(req.params.id))
    if (!domain || domain.userId !== req.userId) {
      return sendError(res, '域名不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    // 删除关联的提醒
    await deleteRemindersByDomainId(domain.id)
    await deleteDomain(Number(req.params.id))

    logger.info({ domainId: domain.id, name: domain.name }, 'Domain deleted')

    return res.status(HTTP_STATUS.NO_CONTENT).send()
  }
  catch (error) {
    logger.error({ error }, 'Delete domain error')
    return sendError(res, '删除域名失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 添加提醒
router.post('/:id/reminders', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const domain = await getDomainById(Number(req.params.id))
    if (!domain || domain.userId !== req.userId) {
      return sendError(res, '域名不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    const data = reminderSchema.parse(req.body)
    const reminder = await createReminder({
      domainId: domain.id,
      daysBefore: data.daysBefore,
    })

    logger.info({ domainId: domain.id, reminderId: reminder.id }, 'Reminder created')

    return sendSuccess(res, reminder, '提醒创建成功', HTTP_STATUS.CREATED)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Create reminder error')
    return sendError(res, '创建提醒失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
