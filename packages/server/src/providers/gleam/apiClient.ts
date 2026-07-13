/**
 * Gleam (HL6) API 客户端
 *
 * 封装 Gleam 子域名管理服务的 HTTP API 调用。
 * API 文档: https://sld.0n.pub/docs
 *
 * 认证方式: X-API-Key 请求头
 * 写操作需要 X-Idempotency-Key 请求头
 */

import { randomUUID } from 'node:crypto'

import { logger } from '@/utils/index.js'

/** Gleam API 配置 */
interface GleamConfig {
  apiKey: string
  apiUrl?: string
}

/** Gleam 统一响应格式 */
interface GleamResponse<T = any> {
  code: number
  message: string
  data: T
}

/** Gleam 子域名信息 */
export interface GleamSubdomain {
  id: number
  domain_id: number
  user_id: number
  name: string
  fqdn: string
  claim_cost: number
  status: string
  dns_records?: GleamDNSRecord[]
  created_at: string
  updated_at: string
}

/** Gleam DNS 记录 */
export interface GleamDNSRecord {
  id: number
  subdomain_id: number
  type: string
  name: string
  content: string
  ttl: number
  proxied: boolean
  provider_record_id: string
  status: string
  created_at: string
  updated_at: string
}

/** Gleam API 操作结果 */
export interface GleamApiResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

const GLEAM_DEFAULT_API_URL = 'https://sld.0n.pub/api/v1/open'

/**
 * Gleam API 客户端
 *
 * 示例：
 *
 *   import { GleamApiClient } from './apiClient'
 *
 *   const client = new GleamApiClient({ apiKey: 'hl6_xxx' })
 *   const subdomains = await client.listSubdomains()
 */
export class GleamApiClient {
  private apiUrl: string
  private apiKey: string

  constructor(config: GleamConfig) {
    this.apiUrl = config.apiUrl || GLEAM_DEFAULT_API_URL
    this.apiKey = config.apiKey
  }

  /**
   * 构建请求头（含认证）
   */
  private buildHeaders(includeIdempotency: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    }
    if (includeIdempotency) {
      headers['X-Idempotency-Key'] = randomUUID()
    }
    return headers
  }

  /**
   * 统一请求入口
   */
  private async request<T = any>(
    path: string,
    options: { method?: string, body?: Record<string, any>, idempotency?: boolean } = {},
  ): Promise<GleamApiResult<T>> {
    const { method = 'GET', body, idempotency = false } = options

    try {
      const init: RequestInit = {
        method,
        headers: this.buildHeaders(idempotency),
      }
      if (body) {
        init.body = JSON.stringify(body)
      }

      const url = `${this.apiUrl}${path}`
      logger.debug({ provider: 'gleam', method, path }, 'API request')
      const response = await fetch(url, init)
      const text = await response.text()
      const raw: GleamResponse<T> | undefined = text ? JSON.parse(text) : undefined

      if (!response.ok || (raw && raw.code !== 0)) {
        const error = raw?.message || `HTTP ${response.status}`
        logger.warn({ provider: 'gleam', method, path, status: response.status, error }, 'API error')
        return {
          success: false,
          error,
        }
      }

      logger.debug({ provider: 'gleam', method, path, status: response.status }, 'API response')
      return {
        success: true,
        data: raw?.data,
      }
    }
    catch (error: any) {
      logger.error({ provider: 'gleam', method, path, error: error.message }, 'API network error')
      return {
        success: false,
        error: error.message || 'Network error',
      }
    }
  }

  // --- 子域名相关 ---

  /**
   * 获取当前 API Key 拥有的所有子域名
   */
  async listSubdomains(): Promise<GleamApiResult<GleamSubdomain[]>> {
    return this.request<GleamSubdomain[]>('/subdomains')
  }

  /**
   * 获取单个子域名详情（含 DNS 记录）
   */
  async getSubdomain(id: number): Promise<GleamApiResult<GleamSubdomain>> {
    return this.request<GleamSubdomain>(`/subdomains/${id}`)
  }

  // --- DNS 记录相关 ---

  /**
   * 获取子域名的 DNS 记录列表
   * @param subdomainId 子域名 ID
   */
  async listDNSRecords(subdomainId: number): Promise<GleamApiResult<GleamDNSRecord[]>> {
    return this.request<GleamDNSRecord[]>(`/dns-records/${subdomainId}`)
  }

  /**
   * 创建 DNS 记录
   * @param subdomainId 子域名 ID
   * @param record.type 记录类型（A/AAAA/CNAME/TXT）
   * @param record.content 记录值
   * @param record.proxied 是否启用代理
   */
  async createDNSRecord(
    subdomainId: number,
    record: { type: string, content: string, proxied?: boolean },
  ): Promise<GleamApiResult<GleamDNSRecord>> {
    return this.request<GleamDNSRecord>(`/dns-records/${subdomainId}`, {
      method: 'POST',
      body: record,
      idempotency: true,
    })
  }

  /**
   * 更新 DNS 记录
   * @param subdomainId 子域名 ID
   * @param recordId DNS 记录 ID
   * @param record.content 记录值
   * @param record.proxied 是否启用代理
   */
  async updateDNSRecord(
    subdomainId: number,
    recordId: number,
    record: { content: string, proxied?: boolean },
  ): Promise<GleamApiResult<GleamDNSRecord>> {
    return this.request<GleamDNSRecord>(`/dns-records/${subdomainId}/${recordId}`, {
      method: 'PUT',
      body: record,
      idempotency: true,
    })
  }

  /**
   * 删除 DNS 记录
   * @param subdomainId 子域名 ID
   * @param recordId DNS 记录 ID
   */
  async deleteDNSRecord(subdomainId: number, recordId: number): Promise<GleamApiResult<Record<string, any>>> {
    return this.request(`/dns-records/${subdomainId}/${recordId}`, {
      method: 'DELETE',
      idempotency: true,
    })
  }
}
