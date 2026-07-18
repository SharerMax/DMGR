/** 域名实体（API 响应格式，日期为 ISO 字符串） */
export interface Domain {
  id: number
  name: string
  providerId: number | null
  provider_name?: string | null
  userId: number
  expiryDate: string | null
  autoRenew: boolean
  autoRenewDays: number | null
  renewalPrice: number | null
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

/** 创建域名输入（API 请求体，不含 userId） */
export interface CreateDomainInput {
  name: string
  providerId?: number | null
  expiryDate?: string | null
  autoRenew?: boolean
  autoRenewDays?: number | null
  renewalPrice?: number | null
  notes?: string | null
}

/** 更新域名输入 */
export interface UpdateDomainInput {
  name?: string
  providerId?: number | null
  expiryDate?: string | null
  autoRenew?: boolean
  autoRenewDays?: number | null
  renewalPrice?: number | null
  status?: string
  notes?: string | null
}

/** 域名筛选条件（查询参数） */
export interface DomainFilters {
  search?: string
  providerId?: number
}
