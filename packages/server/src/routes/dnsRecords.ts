import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/index.js'
import {
  createDNSRecord,
  deleteDNSRecord,
  getDNSRecordById,
  getDNSRecordsByDomainId,
  updateDNSRecord,
} from '../models/dnsRecord.js'
import { getDomainById } from '../models/domain.js'
import { logger } from '../utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const dnsRecordSchema = z.object({
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR', 'SOA']),
  name: z.string().min(1).max(255),
  value: z.string().min(1).max(1000),
  ttl: z.number().positive().optional(),
  priority: z.number().positive().optional(),
})

router.get('/domain/:domainId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const domain = await getDomainById(Number(req.params.domainId))
    if (!domain || domain.userId !== req.userId) {
      return sendError(res, '域名不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    const records = await getDNSRecordsByDomainId(Number(req.params.domainId))
    return sendSuccess(res, records)
  }
  catch (error) {
    logger.error({ error }, 'Get DNS records error')
    return sendError(res, '获取DNS记录失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const record = await getDNSRecordById(Number(req.params.id))
    if (!record) {
      return sendError(res, 'DNS记录不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    const domain = await getDomainById(record.domainId)
    if (!domain || domain.userId !== req.userId) {
      return sendError(res, 'DNS记录不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    return sendSuccess(res, record)
  }
  catch (error) {
    logger.error({ error }, 'Get DNS record error')
    return sendError(res, '获取DNS记录失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { domainId, ...data } = dnsRecordSchema.extend({ domainId: z.number().positive() }).parse(req.body)

    const domain = await getDomainById(domainId)
    if (!domain || domain.userId !== req.userId) {
      return sendError(res, '域名不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    const record = await createDNSRecord({ domainId, ...data })

    logger.info({ recordId: record.id, domainId }, 'DNS record created')

    return sendSuccess(res, record, '创建成功', HTTP_STATUS.CREATED)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Create DNS record error')
    return sendError(res, '创建DNS记录失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const record = await getDNSRecordById(Number(req.params.id))
    if (!record) {
      return sendError(res, 'DNS记录不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    const domain = await getDomainById(record.domainId)
    if (!domain || domain.userId !== req.userId) {
      return sendError(res, 'DNS记录不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    const data = dnsRecordSchema.partial().parse(req.body)
    const updated = await updateDNSRecord(Number(req.params.id), data)

    logger.info({ recordId: updated!.id }, 'DNS record updated')

    return sendSuccess(res, updated, '更新成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Update DNS record error')
    return sendError(res, '更新DNS记录失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const record = await getDNSRecordById(Number(req.params.id))
    if (!record) {
      return sendError(res, 'DNS记录不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    const domain = await getDomainById(record.domainId)
    if (!domain || domain.userId !== req.userId) {
      return sendError(res, 'DNS记录不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    await deleteDNSRecord(Number(req.params.id))

    logger.info({ recordId: record.id }, 'DNS record deleted')

    return res.status(HTTP_STATUS.NO_CONTENT).send()
  }
  catch (error) {
    logger.error({ error }, 'Delete DNS record error')
    return sendError(res, '删除DNS记录失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
