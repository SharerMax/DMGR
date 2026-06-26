import type { User } from '../models/user.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from '../middleware/index.js'
import { createUser, getUserByEmail, getUserById, getUserByUsername, updateUser } from '../models/user.js'

export interface AuthResult {
  user: {
    id: number
    username: string
    email: string | null
    createdAt?: Date
  }
  token: string
}

function sanitizeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  }
}

export async function registerUser(
  username: string,
  password: string,
  email?: string,
): Promise<AuthResult> {
  const existing = await getUserByUsername(username)
  if (existing) {
    throw new Error('用户名已存在')
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const user = await createUser({ username, password: hashedPassword, email })
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

  return { user: sanitizeUser(user), token }
}

export async function loginUser(identifier: string, password: string): Promise<AuthResult> {
  const isEmail = identifier.includes('@')
  const user = isEmail
    ? await getUserByEmail(identifier)
    : await getUserByUsername(identifier)

  if (!user) {
    throw new Error('用户名或密码错误')
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    throw new Error('用户名或密码错误')
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
  return { user: sanitizeUser(user), token }
}

export async function getUserProfile(userId: number) {
  const user = await getUserById(userId)
  if (!user) {
    throw new Error('用户不存在')
  }
  return sanitizeUser(user)
}

export async function updateUserProfile(userId: number, email: string | null | undefined) {
  const user = await updateUser(userId, { email: email || null })
  if (!user) {
    throw new Error('用户不存在')
  }
  return sanitizeUser(user)
}

export async function changeUserPassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await getUserById(userId)
  if (!user) {
    throw new Error('用户不存在')
  }

  const isValid = await bcrypt.compare(currentPassword, user.password)
  if (!isValid) {
    throw new Error('当前密码错误')
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await updateUser(userId, { password: hashedPassword })
}
