import type { Response } from 'express'
import type { ApiResponse } from 'share'

export type { ApiResponse }
export type ApiResponseType<T = any> = ApiResponse<T>

export function success<T>(data?: T, message = '操作成功'): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
  }
}

export function error(message: string, code = 1): ApiResponse {
  return {
    code,
    message,
  }
}

export function sendSuccess<T>(res: Response, data?: T, message = '操作成功', statusCode = 200) {
  return res.status(statusCode).json(success(data, message))
}

export function sendError(res: Response, message: string, code = 1, statusCode = 400) {
  return res.status(statusCode).json(error(message, code))
}

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const
