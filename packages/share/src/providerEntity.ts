import type { ProviderFeatures, ProviderField } from './provider'

/** 服务商实体（API 响应格式） */
export interface Provider {
  id: number
  type: string
  name: string
  config: string
  userId: number
  createdAt: string
  updatedAt: string
}

/** 创建服务商输入（API 请求体，不含 userId） */
export interface CreateProviderInput {
  type: string
  name: string
  config: Record<string, string>
}

/** 更新服务商输入 */
export type UpdateProviderInput = Partial<CreateProviderInput>

/** 服务商类型配置（内置服务商定义） */
export interface ProviderType {
  id: string
  name: string
  description?: string
  fields: ProviderField[]
  features: ProviderFeatures
  maxRenewalDays?: number
}

export type { ProviderFeatures, ProviderField }
