/**
 * 续期日志路由
 */

import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import cron from 'node-cron'
import { z } from 'zod'
import { prisma } from '../db/index.js'
import { authMiddleware } from '../middleware/index.js'
import { executeAutoRenewal, getCurrentCronExpression, stopAutoRenewalScheduler, updateAutoRenewalSchedule } from '../services/autoRenew.js'
import { logger } from '../utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const querySchema = z.object({
  domainId: z.string().optional(),
  domainName: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional().transform(v => v ? Number.parseInt(v, 10) : 1),
  pageSize: z.string().optional().transform(v => v ? Number.parseInt(v, 10) : 20),
})

// 获取续期日志列表
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const query = querySchema.parse(req.query)
    const { domainId, domainName, status, startDate, endDate, page, pageSize } = query

    const where: any = {}

    if (domainId) {
      where.domainId = Number.parseInt(domainId, 10)
    }
    if (domainName) {
      where.domain = {
        ...where.domain,
        name: { contains: domainName },
      }
    }
    if (status) {
      where.status = status
    }
    if (startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(startDate),
      }
    }
    if (endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(`${endDate}T23:59:59.999Z`),
      }
    }

    const total = await prisma.renewalLog.count({
      where,
    })

    const logs = await prisma.renewalLog.findMany({
      where,
      include: {
        domain: {
          select: {
            id: true,
            name: true,
            userId: true,
            provider: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    const filteredLogs = logs.filter(log => log.domain.userId === req.userId)

    return sendSuccess(res, {
      data: filteredLogs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Get renewal logs error')
    return sendError(res, '获取续期日志失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 获取单个续期日志详情
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const log = await prisma.renewalLog.findUnique({
      where: { id: Number.parseInt(id, 10) },
      include: {
        domain: {
          include: {
            provider: true,
          },
        },
      },
    })

    if (!log) {
      return sendError(res, '续期日志不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    if (log.domain.userId !== req.userId) {
      return sendError(res, '无权限访问此日志', 1, HTTP_STATUS.FORBIDDEN)
    }

    return sendSuccess(res, log)
  }
  catch (error) {
    logger.error({ error }, 'Get renewal log error')
    return sendError(res, '获取续期日志详情失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 获取续期统计
router.get('/stats/summary', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userDomains = await prisma.domain.findMany({
      where: { userId: req.userId! },
      select: { id: true },
    })
    const domainIds = userDomains.map(d => d.id)

    const [total, completed, failed, pending, skipped] = await Promise.all([
      prisma.renewalLog.count({
        where: { domainId: { in: domainIds } },
      }),
      prisma.renewalLog.count({
        where: { domainId: { in: domainIds }, status: 'completed' },
      }),
      prisma.renewalLog.count({
        where: { domainId: { in: domainIds }, status: 'failed' },
      }),
      prisma.renewalLog.count({
        where: { domainId: { in: domainIds }, status: 'pending' },
      }),
      prisma.renewalLog.count({
        where: { domainId: { in: domainIds }, status: 'skipped' },
      }),
    ])

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentLogs = await prisma.renewalLog.findMany({
      where: {
        domainId: { in: domainIds },
        createdAt: { gte: sevenDaysAgo },
      },
      include: {
        domain: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return sendSuccess(res, {
      summary: {
        total,
        completed,
        failed,
        pending,
        skipped,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      recentLogs,
    })
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

// 获取自动续期配置
router.get('/config', authMiddleware, async (_req: AuthRequest, res) => {
  try {
    const cronExpression = getCurrentCronExpression()

    return sendSuccess(res, {
      enabled: cronExpression !== '',
      triggerMode: cronExpression ? 'scheduled' : 'manual',
      cronExpression: cronExpression || '0 0 2 * * ?',
    })
  }
  catch (error) {
    logger.error({ error }, 'Get auto-renew config error')
    return sendError(res, '获取自动续期配置失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 更新自动续期配置
router.put('/config', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const config = autoRenewConfigSchema.parse(req.body)

    if (!config.enabled) {
      stopAutoRenewalScheduler()
    }
    else if (config.triggerMode === 'manual') {
      stopAutoRenewalScheduler()
    }
    else if (config.triggerMode === 'scheduled' && config.cronExpression) {
      if (!cron.validate(config.cronExpression)) {
        return sendError(res, '无效的 cron 表达式', 1, HTTP_STATUS.BAD_REQUEST)
      }

      updateAutoRenewalSchedule(config.cronExpression)
    }

    logger.info({ config }, 'Auto-renew config updated')

    return sendSuccess(res, { config }, '配置已更新')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Update auto-renew config error')
    return sendError(res, '更新自动续期配置失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 手动触发续期任务
router.post('/trigger', authMiddleware, async (_req: AuthRequest, res) => {
  try {
    executeAutoRenewal()
      .then((result) => {
        logger.info({ result }, 'Manual renewal triggered')
      })
      .catch((error) => {
        logger.error({ error }, 'Manual renewal failed')
      })

    return sendSuccess(res, undefined, '续期任务已触发')
  }
  catch (error) {
    logger.error({ error }, 'Trigger renewal error')
    return sendError(res, '触发续期任务失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
