import type { UpdateSmtpSettingInput } from 'share'
import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { logger } from '@/utils/index.js'
import { authMiddleware } from '../middleware/index.js'
import { getSmtpSettingForApi, updateSmtpSetting } from '../services/smtpSettingService.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const smtpSettingSchema = z.object({
  host: z.string().max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  user: z.string().max(255).optional(),
  pass: z.string().max(512).optional(),
  from: z.string().max(255).optional(),
})

router.get('/', authMiddleware, (req: AuthRequest, res) => {
  try {
    const setting = getSmtpSettingForApi()
    return sendSuccess(res, setting)
  }
  catch (error) {
    logger.error({ error }, 'Get SMTP settings error')
    return sendError(res, '获取 SMTP 配置失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.put('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = smtpSettingSchema.parse(req.body) as UpdateSmtpSettingInput
    await updateSmtpSetting(data)
    const setting = getSmtpSettingForApi()
    logger.info('SMTP settings updated')
    return sendSuccess(res, setting, 'SMTP 配置已保存')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Update SMTP settings error')
    const message = error instanceof Error ? error.message : '保存 SMTP 配置失败'
    return sendError(res, message, 1, HTTP_STATUS.BAD_REQUEST)
  }
})

export default router
