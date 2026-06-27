import type { AuthRequest } from '../middleware/index.js'
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/index.js'
import { changeUserPassword, getUserProfile, loginUser, registerUser, updateUserProfile } from '../services/userService.js'
import { logger } from '../utils/index.js'
import { HTTP_STATUS, sendError, sendSuccess } from '../utils/response.js'

const router = Router()

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  email: z.email().optional(),
})

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = registerSchema.parse(req.body)
    const result = await registerUser(username, password, email)
    logger.info({ userId: result.user.id }, 'User registered')
    return sendSuccess(res, result, '注册成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    if (error instanceof Error && error.message === '用户名已存在') {
      return sendError(res, error.message, 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Register error')
    return sendError(res, '注册失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body)
    const result = await loginUser(username, password)
    logger.info({ userId: result.user.id }, 'User logged in')
    return sendSuccess(res, result, '登录成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    if (error instanceof Error && error.message === '用户名或密码错误') {
      return sendError(res, error.message, 1, HTTP_STATUS.UNAUTHORIZED)
    }
    logger.error({ error }, 'Login error')
    return sendError(res, '登录失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await getUserProfile(req.userId!)
    return sendSuccess(res, user)
  }
  catch (error) {
    if (error instanceof Error && error.message === '用户不存在') {
      return sendError(res, error.message, 1, HTTP_STATUS.NOT_FOUND)
    }
    return sendError(res, '获取用户信息失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

const updateProfileSchema = z.object({
  email: z.email().optional().nullable(),
})

router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { email } = updateProfileSchema.parse(req.body)
    const user = await updateUserProfile(req.userId!, email || null)
    logger.info({ userId: req.userId }, 'User profile updated')
    return sendSuccess(res, user, '更新成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    if (error instanceof Error && error.message === '用户不存在') {
      return sendError(res, error.message, 1, HTTP_STATUS.NOT_FOUND)
    }
    logger.error({ error }, 'Update profile error')
    return sendError(res, '更新失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
})

router.put('/password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body)
    await changeUserPassword(req.userId!, currentPassword, newPassword)
    logger.info({ userId: req.userId }, 'Password changed')
    return sendSuccess(res, undefined, '密码修改成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    if (error instanceof Error) {
      if (error.message === '用户不存在') {
        return sendError(res, error.message, 1, HTTP_STATUS.NOT_FOUND)
      }
      if (error.message === '当前密码错误') {
        return sendError(res, error.message, 1, HTTP_STATUS.BAD_REQUEST)
      }
    }
    logger.error({ error }, 'Change password error')
    return sendError(res, '修改密码失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
