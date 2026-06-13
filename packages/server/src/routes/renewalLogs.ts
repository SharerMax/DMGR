/**
 * 续期日志路由
 */

import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../db/index.js'

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

// 查询参数 schema
const querySchema = z.object({
  domainId: z.string().optional(),
  domainName: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional().transform(v => v ? parseInt(v, 10) : 1),
  pageSize: z.string().optional().transform(v => v ? parseInt(v, 10) : 20),
})

// 获取续期日志列表
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const query = querySchema.parse(req.query)
    const { domainId, domainName, status, startDate, endDate, page, pageSize } = query

    // 构建查询条件
    const where: any = {}

    // 域名过滤：需要关联查询
    if (domainId) {
      where.domainId = parseInt(domainId, 10)
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
    // 时间范围过滤
    if (startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(startDate),
      }
    }
    if (endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(endDate + 'T23:59:59.999Z'),
      }
    }

    // 查询总数
    const total = await prisma.renewalLog.count({
      where,
    })

    // 分页查询
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

    // 过滤用户自己的域名日志
    const filteredLogs = logs.filter(log => log.domain.userId === req.userId)

    res.json({
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
      return res.status(400).json({ error: error.issues })
    }
    console.error('Get renewal logs error:', error)
    res.status(500).json({ error: '获取续期日志失败' })
  }
})

// 获取单个续期日志详情
router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const log = await prisma.renewalLog.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        domain: {
          include: {
            provider: true,
          },
        },
      },
    })

    if (!log) {
      return res.status(404).json({ error: '续期日志不存在' })
    }

    // 检查权限
    if (log.domain.userId !== req.userId) {
      return res.status(403).json({ error: '无权限访问此日志' })
    }

    res.json(log)
  }
  catch (error) {
    console.error('Get renewal log error:', error)
    res.status(500).json({ error: '获取续期日志详情失败' })
  }
})

// 获取续期统计
router.get('/stats/summary', authMiddleware, async (req: any, res) => {
  try {
    // 获取用户的所有域名
    const userDomains = await prisma.domain.findMany({
      where: { userId: req.userId },
      select: { id: true },
    })
    const domainIds = userDomains.map(d => d.id)

    // 统计各状态的日志数量
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

    // 获取最近7天的日志
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

    res.json({
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
    console.error('Get renewal stats error:', error)
    res.status(500).json({ error: '获取续期统计失败' })
  }
})

export default router
