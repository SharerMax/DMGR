import type { AuthRequest } from '../middleware/index.js'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { authMiddleware, JWT_SECRET } from '../middleware/index.js'
import { createUser, getUserByEmail, getUserById, getUserByUsername, updateUser } from '../models/user.js'
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

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = registerSchema.parse(req.body)

    // 检查用户是否存在
    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      return sendError(res, '用户名已存在', 1, HTTP_STATUS.BAD_REQUEST)
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await createUser({
      username,
      password: hashedPassword,
      email,
    })

    // 生成token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    logger.info({ userId: user.id }, 'User registered')

    return sendSuccess(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    }, '注册成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Register error')
    return sendError(res, '注册失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body)

    // 查找用户，支持用户名或邮箱登录
    const isEmail = username.includes('@')
    const user = isEmail ? await getUserByEmail(username) : await getUserByUsername(username)
    if (!user) {
      return sendError(res, '用户名或密码错误', 1, HTTP_STATUS.UNAUTHORIZED)
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return sendError(res, '用户名或密码错误', 1, HTTP_STATUS.UNAUTHORIZED)
    }

    // 生成token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    logger.info({ userId: user.id }, 'User logged in')

    return sendSuccess(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    }, '登录成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Login error')
    return sendError(res, '登录失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 获取当前用户信息
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await getUserById(req.userId!)
    if (!user) {
      return sendError(res, '用户不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    return sendSuccess(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    })
  }
  catch {
    return sendError(res, '获取用户信息失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 更新用户信息（邮箱）
const updateProfileSchema = z.object({
  email: z.string().email().optional().nullable(),
})

router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { email } = updateProfileSchema.parse(req.body)

    const user = await updateUser(req.userId!, { email: email || null })
    if (!user) {
      return sendError(res, '用户不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    logger.info({ userId: req.userId }, 'User profile updated')

    return sendSuccess(res, {
      id: user.id,
      username: user.username,
      email: user.email,
    }, '更新成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Update profile error')
    return sendError(res, '更新失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 修改密码
const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
})

router.put('/password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body)

    // 验证当前密码
    const user = await getUserById(req.userId!)
    if (!user) {
      return sendError(res, '用户不存在', 1, HTTP_STATUS.NOT_FOUND)
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return sendError(res, '当前密码错误', 1, HTTP_STATUS.BAD_REQUEST)
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await updateUser(req.userId!, { password: hashedPassword })

    logger.info({ userId: req.userId }, 'Password changed')

    return sendSuccess(res, undefined, '密码修改成功')
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Change password error')
    return sendError(res, '修改密码失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
