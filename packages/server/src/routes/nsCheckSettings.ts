import type { NsCheckTestInput, UpdateNsCheckSettingInput } from 'share'
import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { logger } from '@/utils/index.js'
import { authMiddleware } from '../middleware/index.js'
import { getNsCheckSettingForApi, testNsCheck, updateNsCheckSetting } from '../services/nsCheckSettingService.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const nsCheckSettingSchema = z.object({
  server: z.string().max(255).optional(),
})

const nsCheckTestSchema = z.object({
  server: z.string().max(255).optional(),
  domain: z.string().min(1).max(255),
})

router.get('/', authMiddleware, async (_req: AuthRequest, res) => {
  try {
    const setting = await getNsCheckSettingForApi()
    return sendSuccess(res, setting)
  }
  catch (error) {
    logger.error({ error }, 'Get NS check settings error')
    return sendError(res, '获取 NS 检查配置失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.put('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = nsCheckSettingSchema.parse(req.body) as UpdateNsCheckSettingInput
    await updateNsCheckSetting(data)
    const setting = await getNsCheckSettingForApi()
    logger.info('NS check settings updated')
    return sendSuccess(res, setting, 'NS 检查配置已保存')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Update NS check settings error')
    const message = error instanceof Error ? error.message : '保存 NS 检查配置失败'
    return sendError(res, message, 1, HTTP_STATUS.BAD_REQUEST)
  }
})

router.post('/check', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = nsCheckTestSchema.parse(req.body) as NsCheckTestInput
    const result = await testNsCheck(data)
    return sendSuccess(res, result)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Test NS check settings error')
    return sendError(res, '测试 NS 检查服务器失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
