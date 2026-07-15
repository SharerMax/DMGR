/**
 * DNSHE API 客户端
 *
 * 封装 DNSHE 免费域名管理服务的 HTTP API 调用。
 * API 文档: https://my.dnshe.com/knowledgebase/13/DNSHE-Free-Domain-API-User-Guide-V2.0.html
 *
 * 认证方式: X-API-Key + X-API-Secret 请求头
 * API 地址: https://api005.dnshe.com/index.php?m=domain_hub
 * 速率限制: 60 请求/分钟
 */

import { logger } from '@/utils/index.js'

/** DNSHE API 配置 */
interface DnsheConfig {
  apiKey: string
  apiSecret: string
  apiUrl?: string
}

/** DNSHE 统一响应格式 */
interface DnsheResponse<T = any> {
  success: boolean
  message?: string
  error?: string
  error_code?: string
  details?: Record<string, any>
  data?: T
  [key: string]: any
}

/** DNSHE 子域名信息 */
export interface DnsheSubdomain {
  id: number
  subdomain: string
  rootdomain: string
  full_domain: string
  status: string
  created_at?: string
  updated_at?: string
  expires_at?: string | null
  never_expires?: number
}

/** DNSHE DNS 记录 */
export interface DnsheDNSRecord {
  id: number
  record_id?: string
  name: string
  type: string
  content: string
  ttl: number
  priority?: number | null
  line?: string | null
  proxied?: boolean
  status: string
  created_at?: string
  updated_at?: string
}

/** DNSHE 续期结果 */
export interface DnsheRenewalResult {
  subdomain_id: number
  subdomain?: string
  previous_expires_at?: string
  new_expires_at?: string
  renewed_at?: string
  never_expires?: number
  status?: string
  remaining_days?: number
  charged_amount?: number
}

/** DNSHE 分页信息 */
export interface DnshePagination {
  page: number
  per_page: number
  has_more: boolean
  next_page?: number
  prev_page?: number
  total?: number
}

/** DNSHE 列表子域名响应 */
export interface DnsheListSubdomainsResponse {
  count: number
  subdomains: DnsheSubdomain[]
  pagination?: DnshePagination
}

/** DNSHE API 操作结果 */
export interface DnsheApiResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

const DNSHE_DEFAULT_API_URL = 'https://api005.dnshe.com/index.php'

/**
 * DNSHE API 客户端
 *
 * 示例：
 *
 *   import { DnsheApiClient } from './apiClient'
 *
 *   const client = new DnsheApiClient({ apiKey: 'cfsd_xxx', apiSecret: 'yyy' })
 *   const subdomains = await client.listSubdomains()
 */
export class DnsheApiClient {
  private apiUrl: string
  private apiKey: string
  private apiSecret: string

  constructor(config: DnsheConfig) {
    this.apiUrl = config.apiUrl || DNSHE_DEFAULT_API_URL
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
  }

  /**
   * 构建请求头（含认证）
   */
  private buildHeaders(): Record<string, string> {
    return {
      'X-API-Key': this.apiKey,
      'X-API-Secret': this.apiSecret,
      'Content-Type': 'application/json',
    }
  }

  /**
   * 构建 DNSHE 风格的 URL
   * 格式: {apiUrl}?m=domain_hub&endpoint={endpoint}&action={action}&{queryParams}
   */
  private buildUrl(
    endpoint: string,
    action: string,
    queryParams?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(this.apiUrl)
    url.searchParams.set('m', 'domain_hub')
    url.searchParams.set('endpoint', endpoint)
    url.searchParams.set('action', action)

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      }
    }

    return url.toString()
  }

  /**
   * 统一请求入口
   */
  private async request<T = any>(
    endpoint: string,
    action: string,
    options: {
      method?: string
      body?: Record<string, any>
      queryParams?: Record<string, string | number | boolean | undefined>
    } = {},
  ): Promise<DnsheApiResult<T>> {
    const { method = 'GET', body, queryParams } = options
    const url = this.buildUrl(endpoint, action, queryParams)

    try {
      const init: RequestInit = {
        method,
        headers: this.buildHeaders(),
      }
      if (body && method !== 'GET') {
        init.body = JSON.stringify(body)
      }

      logger.debug({ provider: 'dnshe', method, endpoint, action }, 'API request')
      const response = await fetch(url, init)
      const text = await response.text()
      const raw: DnsheResponse<T> | undefined = text ? JSON.parse(text) : undefined

      if (!response.ok || (raw && raw.success === false)) {
        const error = raw?.message || raw?.error || `HTTP ${response.status}`
        logger.warn(
          { provider: 'dnshe', method, endpoint, action, status: response.status, error },
          'API error',
        )
        return { success: false, error }
      }

      logger.debug(
        { provider: 'dnshe', method, endpoint, action, status: response.status },
        'API response',
      )
      return { success: true, data: raw as T }
    }
    catch (error: any) {
      logger.error(
        { provider: 'dnshe', method, endpoint, action, error: error.message },
        'API network error',
      )
      return { success: false, error: error.message || 'Network error' }
    }
  }

  // --- 子域名相关 ---

  /**
   * 列出子域名（自动分页处理，返回全部）
   */
  async listSubdomains(
    options: {
      search?: string
      rootdomain?: string
      status?: string
      perPage?: number
    } = {},
  ): Promise<DnsheApiResult<DnsheListSubdomainsResponse>> {
    const allSubdomains: DnsheSubdomain[] = []
    let page = 1
    const perPage = options.perPage || 200
    let total: number | undefined

    while (true) {
      const result = await this.request<DnsheListSubdomainsResponse>('subdomains', 'list', {
        method: 'GET',
        queryParams: {
          page,
          per_page: perPage,
          search: options.search,
          rootdomain: options.rootdomain,
          status: options.status,
        },
      })

      if (!result.success || !result.data) {
        return { success: false, error: result.error || '获取子域名列表失败' }
      }

      const data = result.data
      allSubdomains.push(...(data.subdomains || []))

      if (data.pagination?.total !== undefined) {
        total = data.pagination.total
      }

      // 通过 has_more 判断是否还有下一页
      if (!data.pagination?.has_more) {
        break
      }

      page++
      if (page > 100) {
        // 安全限制，避免无限循环
        break
      }
    }

    return {
      success: true,
      data: {
        count: allSubdomains.length,
        subdomains: allSubdomains,
        pagination: total !== undefined
          ? {
              page,
              per_page: perPage,
              has_more: false,
              total,
            }
          : undefined,
      },
    }
  }

  /**
   * 获取子域名详情（含 DNS 记录）
   */
  async getSubdomain(subdomainId: number): Promise<DnsheApiResult<DnsheResponse>> {
    return this.request<DnsheResponse>('subdomains', 'get', {
      method: 'GET',
      queryParams: { subdomain_id: subdomainId },
    })
  }

  /**
   * 续期子域名
   */
  async renewSubdomain(subdomainId: number): Promise<DnsheApiResult<DnsheRenewalResult>> {
    const result = await this.request<DnsheResponse>('subdomains', 'renew', {
      method: 'POST',
      body: { subdomain_id: subdomainId },
    })

    if (!result.success || !result.data) {
      return { success: false, error: result.error || '续期失败' }
    }

    return { success: true, data: result.data as unknown as DnsheRenewalResult }
  }

  // --- DNS 记录相关 ---

  /**
   * 获取子域名的 DNS 记录列表
   */
  async listDNSRecords(subdomainId: number): Promise<DnsheApiResult<DnsheDNSRecord[]>> {
    const result = await this.request<DnsheResponse>('dns_records', 'list', {
      method: 'GET',
      queryParams: { subdomain_id: subdomainId },
    })

    if (!result.success || !result.data) {
      return { success: false, error: result.error || '获取 DNS 记录失败' }
    }

    return { success: true, data: (result.data.records || []) as DnsheDNSRecord[] }
  }

  /**
   * 创建 DNS 记录
   */
  async createDNSRecord(
    subdomainId: number,
    record: {
      type: string
      name?: string
      content: string
      ttl?: number
      priority?: number
      line?: string
    },
  ): Promise<DnsheApiResult<DnsheDNSRecord>> {
    const result = await this.request<DnsheResponse>('dns_records', 'create', {
      method: 'POST',
      body: {
        subdomain_id: subdomainId,
        type: record.type,
        name: record.name || '@',
        content: record.content,
        ttl: record.ttl || 600,
        priority: record.priority,
        line: record.line,
      },
    })

    if (!result.success || !result.data) {
      return { success: false, error: result.error || '创建 DNS 记录失败' }
    }

    // DNSHE 创建接口仅返回 id 和 record_id，需要通过 list 获取完整记录
    const createdId = result.data.id
    if (createdId !== undefined) {
      const recordsResult = await this.listDNSRecords(subdomainId)
      if (recordsResult.success && recordsResult.data) {
        const created = recordsResult.data.find(r => r.id === createdId)
        if (created) {
          return { success: true, data: created }
        }
      }
    }

    // 兜底：返回基础信息
    return {
      success: true,
      data: {
        id: createdId,
        record_id: result.data.record_id,
        name: record.name || '@',
        type: record.type,
        content: record.content,
        ttl: record.ttl || 600,
        priority: record.priority ?? null,
        line: record.line ?? null,
        status: 'active',
      },
    }
  }

  /**
   * 更新 DNS 记录
   */
  async updateDNSRecord(
    subdomainId: number,
    recordId: number,
    record: {
      type?: string
      name?: string
      content?: string
      ttl?: number
      priority?: number
      line?: string
    },
  ): Promise<DnsheApiResult<DnsheDNSRecord>> {
    const result = await this.request<DnsheResponse>('dns_records', 'update', {
      method: 'POST',
      body: {
        id: recordId,
        subdomain_id: subdomainId,
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl,
        priority: record.priority,
        line: record.line,
      },
    })

    if (!result.success || !result.data) {
      return { success: false, error: result.error || '更新 DNS 记录失败' }
    }

    // 获取最新记录
    const recordsResult = await this.listDNSRecords(subdomainId)
    if (recordsResult.success && recordsResult.data) {
      const updated = recordsResult.data.find(r => r.id === recordId)
      if (updated) {
        return { success: true, data: updated }
      }
    }

    // 兜底
    return {
      success: true,
      data: {
        id: recordId,
        name: record.name || '@',
        type: record.type || '',
        content: record.content || '',
        ttl: record.ttl || 600,
        priority: record.priority ?? null,
        line: record.line ?? null,
        status: 'active',
      },
    }
  }

  /**
   * 删除 DNS 记录
   */
  async deleteDNSRecord(recordId: number): Promise<DnsheApiResult<Record<string, any>>> {
    return this.request<DnsheResponse>('dns_records', 'delete', {
      method: 'POST',
      body: { id: recordId },
    })
  }

  /**
   * 根据完整域名查找子域名 ID
   */
  async findSubdomainIdByDomain(domain: string): Promise<DnsheApiResult<number>> {
    const response = await this.listSubdomains({ search: domain })
    if (!response.success || !response.data) {
      return { success: false, error: response.error || '获取子域名列表失败' }
    }

    const subdomain = response.data.subdomains.find(
      (s: DnsheSubdomain) =>
        s.full_domain === domain
        || s.subdomain === domain
        || `${s.subdomain}.${s.rootdomain}` === domain,
    )

    if (!subdomain) {
      return { success: false, error: `未找到域名 ${domain} 对应的子域名` }
    }

    return { success: true, data: subdomain.id }
  }
}
