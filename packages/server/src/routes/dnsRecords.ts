import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import {
  createDNSRecord,
  deleteDNSRecord,
  getDNSRecordById,
  getDNSRecordsByDomainId,
  updateDNSRecord,
} from '../models/dnsRecord.js'
import { getDomainById } from '../models/domain.js'

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

const dnsRecordSchema = z.object({
  type: z.enum(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SRV', 'CAA', 'PTR', 'SOA']),
  name: z.string().min(1).max(255),
  value: z.string().min(1).max(1000),
  ttl: z.number().positive().optional(),
  priority: z.number().positive().optional(),
})

router.get('/domain/:domainId', authMiddleware, async (req: any, res) => {
  try {
    const domain = await getDomainById(Number(req.params.domainId))
    if (!domain || domain.userId !== req.userId) {
      return res.status(404).json({ error: '域名不存在' })
    }

    const records = await getDNSRecordsByDomainId(Number(req.params.domainId))
    res.json(records)
  }
  catch (error) {
    console.error('Get DNS records error:', error)
    res.status(500).json({ error: '获取DNS记录失败' })
  }
})

router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const record = await getDNSRecordById(Number(req.params.id))
    if (!record) {
      return res.status(404).json({ error: 'DNS记录不存在' })
    }

    const domain = await getDomainById(record.domainId)
    if (!domain || domain.userId !== req.userId) {
      return res.status(404).json({ error: 'DNS记录不存在' })
    }

    res.json(record)
  }
  catch (error) {
    console.error('Get DNS record error:', error)
    res.status(500).json({ error: '获取DNS记录失败' })
  }
})

router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const { domainId, ...data } = dnsRecordSchema.extend({ domainId: z.number().positive() }).parse(req.body)

    const domain = await getDomainById(domainId)
    if (!domain || domain.userId !== req.userId) {
      return res.status(404).json({ error: '域名不存在' })
    }

    const record = await createDNSRecord({ domainId, ...data })
    res.status(201).json(record)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }
    console.error('Create DNS record error:', error)
    res.status(500).json({ error: '创建DNS记录失败' })
  }
})

router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    const record = await getDNSRecordById(Number(req.params.id))
    if (!record) {
      return res.status(404).json({ error: 'DNS记录不存在' })
    }

    const domain = await getDomainById(record.domainId)
    if (!domain || domain.userId !== req.userId) {
      return res.status(404).json({ error: 'DNS记录不存在' })
    }

    const data = dnsRecordSchema.partial().parse(req.body)
    const updated = await updateDNSRecord(Number(req.params.id), data)
    res.json(updated)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors })
    }
    console.error('Update DNS record error:', error)
    res.status(500).json({ error: '更新DNS记录失败' })
  }
})

router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    const record = await getDNSRecordById(Number(req.params.id))
    if (!record) {
      return res.status(404).json({ error: 'DNS记录不存在' })
    }

    const domain = await getDomainById(record.domainId)
    if (!domain || domain.userId !== req.userId) {
      return res.status(404).json({ error: 'DNS记录不存在' })
    }

    await deleteDNSRecord(Number(req.params.id))
    res.status(204).send()
  }
  catch (error) {
    console.error('Delete DNS record error:', error)
    res.status(500).json({ error: '删除DNS记录失败' })
  }
})

export default router
