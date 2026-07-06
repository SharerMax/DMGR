import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/index.js'
import {
  addDomainReminder,
  createUserDomain,
  deleteUserDomain,
  getDomainWithReminders,
  getUserDomains,
  getUserExpiringDomains,
  updateUserDomain,
} from '../services/domainService.js'
import { logger } from '../utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const domainSchema = z.object({
  name: z.string().min(1).max(255),
  providerId: z.number().optional().nullable(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  autoRenew: z.boolean().optional(),
  autoRenewDays: z.number().int().positive().optional().nullable(),
  renewalPrice: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const reminderSchema = z.object({
  daysBefore: z.number().positive(),
})

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { search, providerId } = req.query
    const domains = await getUserDomains(req.userId!, {
      search: search ? String(search) : undefined,
      providerId: providerId ? Number(providerId) : undefined,
    })
    return sendSuccess(res, domains)
  }
  catch (error) {
    logger.error({ error }, 'Get domains error')
    return sendError(res, '获取域名列表失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.get('/expiring', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const days = Number(req.query.days) || 30
    const domains = await getUserExpiringDomains(req.userId!, days)
    return sendSuccess(res, domains)
  }
  catch (error) {
    logger.error({ error }, 'Get expiring domains error')
    return sendError(res, '获取即将过期域名失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const domain = await getDomainWithReminders(req.userId!, Number(req.params.id))
    if (!domain) {
      return sendError(res, '域名不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    return sendSuccess(res, domain)
  }
  catch (error) {
    logger.error({ error }, 'Get domain error')
    return sendError(res, '获取域名失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = domainSchema.parse(req.body)
    const domain = await createUserDomain(req.userId!, data)
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

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = domainSchema.partial().parse(req.body)
    const updated = await updateUserDomain(req.userId!, Number(req.params.id), data)
    if (!updated) {
      return sendError(res, '域名不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    logger.info({ domainId: updated.id }, 'Domain updated')
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

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const success = await deleteUserDomain(req.userId!, Number(req.params.id))
    if (!success) {
      return sendError(res, '域名不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    logger.info({ domainId: Number(req.params.id) }, 'Domain deleted')
    return res.status(HTTP_STATUS.NO_CONTENT).send()
  }
  catch (error) {
    logger.error({ error }, 'Delete domain error')
    return sendError(res, '删除域名失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.post('/:id/reminders', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = reminderSchema.parse(req.body)
    const reminder = await addDomainReminder(req.userId!, Number(req.params.id), data.daysBefore)
    if (!reminder) {
      return sendError(res, '域名不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    logger.info({ domainId: Number(req.params.id), reminderId: reminder.id }, 'Reminder created')
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
