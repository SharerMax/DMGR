import bcrypt from 'bcryptjs'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { createUser, getUserById, getUserByUsername, updateUser } from '../models/user.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  email: z.string().email().optional(),
})

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
})

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = registerSchema.parse(req.body)

    // 检查用户是否存在
    const existingUser = await getUserByUsername(username)
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' })
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

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    })
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    console.error('Register error:', error)
    res.status(500).json({ error: '注册失败' })
  }
})

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body)

    // 查找用户
    const user = await getUserByUsername(username)
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    // 生成token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    })
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    console.error('Login error:', error)
    res.status(500).json({ error: '登录失败' })
  }
})

// 获取当前用户信息
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }

    const user = await getUserById(decoded.userId)
    if (!user) {
      return res.status(401).json({ error: '用户不存在' })
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    })
  }
  catch {
    res.status(401).json({ error: '未授权' })
  }
})

// 更新用户信息（邮箱）
const updateProfileSchema = z.object({
  email: z.string().email().optional().nullable(),
})

router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }

    const { email } = updateProfileSchema.parse(req.body)

    const user = await updateUser(decoded.userId, { email: email || null })
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
    })
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    console.error('Update profile error:', error)
    res.status(500).json({ error: '更新失败' })
  }
})

// 修改密码
const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
})

router.put('/password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body)

    // 验证当前密码
    const user = await getUserById(decoded.userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return res.status(400).json({ error: '当前密码错误' })
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await updateUser(decoded.userId, { password: hashedPassword })

    res.json({ message: '密码修改成功' })
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues })
    }
    console.error('Change password error:', error)
    res.status(500).json({ error: '修改密码失败' })
  }
})

export default router
