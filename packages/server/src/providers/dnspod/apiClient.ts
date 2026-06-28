/**
 * DNSPod API 客户端（基于传统 dnsapi.cn 接口，使用 login_token 认证）
 * 直接提供业务化的 API 方法，由 provider / syncer 导入使用
 */

interface DnspodConfig {
  loginToken: string
  apiUrl?: string
}

interface DnspodRawResponse<T = any> {
  status: {
    code: string
    message: string
    created_at: string
  }
  domains?: T
  domain?: any
  records?: any
  record?: any
}

interface DnspodRecord {
  id: string
  sub_domain: string
  record_type: string
  value: string
  ttl: string
  mx?: string
  line: string
  status: string
  updated_on: string
}

interface DnspodDomain {
  id: string
  name: string
  status: string
  created_on: string
  updated_on: string
  group_id?: string
}

export interface DnspodApiResult<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
  raw?: any
}

const DNSPOD_DEFAULT_API_URL = 'https://dnsapi.cn'

/**
 * DNSPod API 客户端
 *
 * 示例：
 *
 *   import { DnspodApiClient } from './apiClient'
 *
 *   const client = new DnspodApiClient({ loginToken: 'ID,Token' })
 *   const records = await client.listRecords('example.com')
 */
export class DnspodApiClient {
  private apiUrl: string
  private loginToken: string

  constructor(config: DnspodConfig) {
    this.apiUrl = config.apiUrl || DNSPOD_DEFAULT_API_URL
    this.loginToken = config.loginToken
  }

  private buildFormBody(params: Record<string, any>): string {
    const form = new URLSearchParams()
    form.append('login_token', this.loginToken)
    form.append('format', 'json')
    form.append('lang', 'en')
    form.append('error_on_empty', 'no')
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null)
        form.append(key, String(value))
    }
    return form.toString()
  }

  private async request<T = any>(
    path: string,
    params: Record<string, any> = {},
  ): Promise<DnspodApiResult<T>> {
    const init: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'DMGR/1.0 (support@example.com)',
      },
      body: this.buildFormBody(params),
    }

    try {
      const url = `${this.apiUrl}${path}`
      const response = await fetch(url, init)
      const text = await response.text()
      const raw: DnspodRawResponse<T> | undefined = text ? JSON.parse(text) : undefined

      if (!response.ok) {
        return {
          success: false,
          error: raw?.status?.message || `HTTP ${response.status}`,
          code: raw?.status?.code || String(response.status),
          raw,
        }
      }

      if (raw?.status && raw.status.code !== '1') {
        return {
          success: false,
          error: raw.status.message || 'DNSPod API 错误',
          code: raw.status.code,
          raw,
        }
      }

      return {
        success: true,
        data: raw as unknown as T,
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

  async listRecords(domain: string): Promise<DnspodApiResult<{ records?: DnspodRecord[] }>> {
    return this.request('/Record.List', { domain })
  }

  async createRecord(domain: string, record: { subDomain: string, recordType: string, recordLine: string, value: string, ttl?: number, mx?: number }): Promise<DnspodApiResult<{ record?: DnspodRecord }>> {
    return this.request('/Record.Create', {
      domain,
      sub_domain: record.subDomain,
      record_type: record.recordType,
      record_line: record.recordLine || '默认',
      value: record.value,
      ttl: record.ttl || 600,
      ...(record.mx !== undefined && record.mx !== null ? { mx: record.mx } : {}),
    })
  }

  async updateRecord(domain: string, recordId: string, record: { subDomain?: string, recordType?: string, recordLine?: string, value?: string, ttl?: number, mx?: number }): Promise<DnspodApiResult<{ record?: DnspodRecord }>> {
    const params: Record<string, any> = {
      domain,
      record_id: recordId,
    }
    if (record.subDomain !== undefined)
      params.sub_domain = record.subDomain
    if (record.recordType !== undefined)
      params.record_type = record.recordType
    if (record.recordLine !== undefined)
      params.record_line = record.recordLine
    if (record.value !== undefined)
      params.value = record.value
    if (record.ttl !== undefined)
      params.ttl = record.ttl
    if (record.mx !== undefined && record.mx !== null)
      params.mx = record.mx
    return this.request('/Record.Modify', params)
  }

  async deleteRecord(domain: string, recordId: string): Promise<DnspodApiResult<Record<string, any>>> {
    return this.request('/Record.Remove', { domain, record_id: recordId })
  }

  // --- 域名相关 ---

  async listDomains(): Promise<DnspodApiResult<{ domains?: DnspodDomain[] }>> {
    return this.request('/Domain.List', { type: 'all', offset: 0, length: 100 })
  }

  async getDomainInfo(domain: string): Promise<DnspodApiResult<{ domain?: DnspodDomain }>> {
    return this.request('/Domain.Info', { domain })
  }
}
