import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { HTTP_STATUS, sendError } from '../utils/response.js'

export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export interface AuthRequest extends Request {
  userId?: number
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, '未授权', 1, HTTP_STATUS.UNAUTHORIZED)
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number }
    req.userId = decoded.userId
    next()
  }
  catch {
    return sendError(res, '未授权', 1, HTTP_STATUS.UNAUTHORIZED)
  }
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number }
  }
  catch {
    return null
  }
}
