/**
 * VPS8 API 客户端
 * 直接提供业务化的 API 方法，由 provider / syncer 导入使用
 */

import { Buffer } from 'node:buffer'

interface VPS8Config {
  apiKey: string
  apiUrl?: string
}

interface VPS8RawResponse<T = any> {
  result?: T
  error?: string
}

export interface VPS8DNSRecord {
  id: number
  host: string
  type: string
  value: string
  ttl: number
  priority: number
  provider_record_id: string
}

export interface VPS8SelfPlatformDomain {
  domain: string
  platform_type: 'self_platform'
  source_service: 'domain'
  created_at: string
  expires_at: string
}

export interface VPS8OtherPlatformDomain {
  domain: string
  platform_type: 'hosted'
  source_service: 'dns'
}

export type VPS8Domain = VPS8SelfPlatformDomain | VPS8OtherPlatformDomain

export interface VPS8ApiResult<T = any> {
  success: boolean
  data?: T
  error?: string
  raw?: any
}

const VPS8_DEFAULT_API_URL = 'https://vps8.zz.cd/api/client/dnsopenapi'

/**
 * VPS8 API 客户端
 *
 * 示例：
 *
 *   import { VPS8ApiClient } from './apiClient'
 *
 *   const client = new VPS8ApiClient({ apiKey })
 *   const records = await client.listRecords('example.com')
 */
export class VPS8ApiClient {
  private apiUrl: string
  private apiKey: string

  constructor(config: VPS8Config) {
    this.apiUrl = config.apiUrl || VPS8_DEFAULT_API_URL
    this.apiKey = config.apiKey
  }

  /**
   * 构建 VPS8 请求头（含 Basic Auth）
   */
  private buildHeaders(): Record<string, string> {
    const token = Buffer.from(`client:${this.apiKey}`).toString('base64')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${token}`,
    }
  }

  /**
   * 统一请求入口
   */
  private async request<T = any>(
    apiPath: string,
    params: Record<string, any> = {},
  ): Promise<VPS8ApiResult<T>> {
    const init: RequestInit = {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(params),
    }

    try {
      const url = this.apiUrl && apiPath && !this.apiUrl.endsWith('/') && !apiPath.startsWith('/')
        ? `${this.apiUrl}/${apiPath}`
        : `${this.apiUrl}${apiPath}`

      const response = await fetch(url, init)
      const text = await response.text()
      const raw: VPS8RawResponse<T> | undefined = text ? JSON.parse(text) : undefined

      if (!response.ok) {
        return {
          success: false,
          error: raw?.error || `HTTP ${response.status}`,
          raw,
        }
      }

      if (raw?.error) {
        return {
          success: false,
          error: raw.error,
          raw,
        }
      }

      return {
        success: true,
        data: raw?.result,
        raw,
      }
    }
    catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error',
      }
    }
  }

  // --- DNS 记录相关 ---

  async listRecords(domain: string): Promise<VPS8ApiResult<VPS8DNSRecord[]>> {
    return this.request('/record_list', { domain })
  }

  async createRecord(domain: string, record: { host: string, type: string, value: string, ttl?: number, priority?: number }): Promise<VPS8ApiResult<VPS8DNSRecord>> {
    return this.request('/record_create', {
      domain,
      host: record.host,
      type: record.type,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority,
    })
  }

  async updateRecord(domain: string, recordId: string, record: { value?: string, ttl?: number, priority?: number }): Promise<VPS8ApiResult<VPS8DNSRecord>> {
    return this.request('/record_update', {
      domain,
      id: recordId,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority,
    })
  }

  async deleteRecord(domain: string, recordId: string): Promise<VPS8ApiResult<Record<string, any>>> {
    return this.request('/record_delete', { domain, record_id: recordId })
  }

  // --- 域名相关 ---

  async listDomains(): Promise<VPS8ApiResult<VPS8Domain[]>> {
    return this.request('/domain_list')
  }
}
