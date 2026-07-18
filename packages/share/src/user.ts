/** 用户实体（API 响应格式，不含密码） */
export interface User {
  id: number
  username: string
  email: string | null
  createdAt?: string
}

/** 创建用户输入 */
export interface CreateUserInput {
  username: string
  password: string
  email?: string
}

/** 登录输入 */
export interface LoginInput {
  username: string
  password: string
}
