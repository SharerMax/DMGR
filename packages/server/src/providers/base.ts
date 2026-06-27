/**
 * DNS Provider 抽象基类
 * 定义 DNS 记录管理和域名同步的接口规范
 * 后续可以继承此类实现具体的 DNS 服务商
 */

/**
 * HTTP 请求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * API 请求选项
 */
export interface ApiRequestOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  body?: any
  query?: Record<string, any>
  timeout?: number
}

/**
 * BaseApiClient 通用 API 响应（由各服务商的 response 转换）
 */
export interface ApiClientResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
  raw?: any
}

/**
 * BaseApiClient 配置
 */
export interface BaseApiClientConfig {
  apiUrl?: string
  apiKey?: string
  apiSecret?: string
  [key: string]: any
}

/**
 * BaseApiClient 抽象基类
 * 封装 HTTP 请求和认证逻辑，供 provider/syncer/renewer 共用
 */
export abstract class BaseApiClient {
  protected apiUrl: string
  protected config: BaseApiClientConfig

  constructor(config: BaseApiClientConfig) {
    this.apiUrl = config.apiUrl || ''
    this.config = config
  }

  /**
   * 构建请求头（由子类实现具体认证方式）
   */
  protected buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    }
  }

  /**
   * 构建 URL（拼接路径和查询参数）
   */
  protected buildUrl(path: string, query?: Record<string, any>): string {
    let url = this.apiUrl
    if (path && !url.endsWith('/') && !path.startsWith('/')) {
      url = `${url}/${path}`
    }
    else if (path) {
      url = `${url}${path}`
    }
    else {
      url = this.apiUrl
    }

    if (query && Object.keys(query).length > 0) {
      const qs = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          qs.append(key, String(value))
        }
      }
      const queryString = qs.toString()
      if (queryString) {
        url = `${url}?${queryString}`
      }
    }

    return url
  }

  /**
   * 核心请求方法（由具体子类实现响应解析）
   */
  protected async httpRequest<T = any>(
    path: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiClientResponse<T>> {
    const {
      method = 'GET',
      headers,
      body,
      query,
      timeout,
    } = options

    const finalHeaders = {
      ...this.buildHeaders(),
      ...(headers || {}),
    }

    const url = this.buildUrl(path, query)

    const init: RequestInit = {
      method,
      headers: finalHeaders,
    }

    if (body !== undefined && method !== 'GET') {
      init.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    try {
      const response = timeout
        ? await Promise.race([
            fetch(url, init),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeout)),
          ])
        : await fetch(url, init)

      const text = await response.text()
      const data = text ? JSON.parse(text) : null

      if (!response.ok) {
        return {
          success: false,
          error: data?.message || data?.error || `HTTP ${response.status}`,
          code: String(response.status),
          raw: data,
        }
      }

      return {
        success: true,
        data: data as T,
        raw: data,
      }
    }
    catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error',
      }
    }
  }

  /**
   * 业务层 request 方法（由具体实现者调用）
   * 封装统一的 API 调用方式，返回 provider/syncer/renewer 需要的结构化数据
   *
   * @param pathOrAction API 路径或 action 名称（由具体实现决定）
   * @param params 请求参数
   */
  abstract request<T = any>(pathOrAction: string, params?: Record<string, any>): Promise<ApiClientResponse<T>>
}

export interface DNSRecordInput {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA' | 'PTR' | 'SOA'
  name: string
  value: string
  ttl?: number
  priority?: number | null
  line?: string
}

export interface DNSRecordOutput {
  id: string
  type: string
  name: string
  value: string
  ttl: number
  priority: number | null
  line?: string
  createdAt: string
  updatedAt: string
}

export interface DomainInfo {
  name: string
  registrar?: string
  registrationDate?: string
  expirationDate: string
  status: string
  dnsServers?: string[]
}

export interface SyncResult {
  success: boolean
  domains: DomainInfo[]
  errors?: string[]
}

export interface DNSOperationResult<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

/**
 * 服务商字段配置
 */
export interface ProviderField {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  required: boolean
  placeholder?: string
  description?: string
}

/**
 * 服务商配置
 */
export interface ProviderConfig {
  id: string
  name: string
  description?: string
  fields: ProviderField[]
  supportsAutoRenew: boolean
  maxRenewalDays?: number // 过期前最大可续期天数（仅 supportsAutoRenew=true 时有效）
  features: string[]
}

/**
 * DNS Provider 抽象基类
 * 提供 DNS 记录管理的标准接口
 */
export abstract class DNSProvider {
  // 提供商标识
  abstract readonly id: string
  abstract readonly name: string

  // API 配置
  protected apiUrl?: string
  protected apiKey?: string
  protected apiSecret?: string

  // API 客户端（可选，由具体实现注入）
  protected apiClient?: BaseApiClient

  constructor(config: { apiUrl?: string, apiKey?: string, apiSecret?: string, apiClient?: BaseApiClient }) {
    this.apiUrl = config.apiUrl
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
    this.apiClient = config.apiClient
  }

  /**
   * 验证配置是否完整
   */
  abstract validateConfig(): boolean

  /**
   * 获取域名的所有 DNS 记录
   */
  abstract getDNSRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>>

  /**
   * 添加 DNS 记录
   */
  abstract addDNSRecord(domain: string, record: DNSRecordInput): Promise<DNSOperationResult<DNSRecordOutput>>

  /**
   * 更新 DNS 记录
   */
  abstract updateDNSRecord(
    domain: string,
    recordId: string,
    record: Partial<DNSRecordInput>
  ): Promise<DNSOperationResult<DNSRecordOutput>>

  /**
   * 删除 DNS 记录
   */
  abstract deleteDNSRecord(domain: string, recordId: string): Promise<DNSOperationResult>

  // /**
  //  * 设置 DNS 记录状态（启用/禁用）
  //  */
  // abstract setDNSRecordStatus(
  //   domain: string,
  //   recordId: string,
  //   status: 'ENABLE' | 'DISABLE'
  // ): Promise<DNSOperationResult>

  // /**
  //  * 批量操作 DNS 记录
  //  */
  // abstract batchUpdateDNSRecords(
  //   domain: string,
  //   records: Array<{ id: string, data: Partial<DNSRecordInput> }>
  // ): Promise<DNSOperationResult>
}

/**
 * 域名同步器抽象基类
 * 提供域名同步的标准接口
 */
export abstract class DomainSyncer {
  // 提供商标识
  abstract readonly id: string
  abstract readonly name: string

  // API 配置
  protected apiKey?: string
  protected apiSecret?: string

  // API 客户端（可选，由具体实现注入）
  protected apiClient?: BaseApiClient

  constructor(config: { apiKey?: string, apiSecret?: string, apiClient?: BaseApiClient }) {
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
    this.apiClient = config.apiClient
  }

  /**
   * 验证配置是否完整
   */
  abstract validateConfig(): boolean

  /**
   * 获取账户信息
   */
  abstract getAccountInfo(): Promise<DNSOperationResult<any>>

  /**
   * 获取所有域名列表
   */
  abstract listDomains(): Promise<DNSOperationResult<DomainInfo[]>>

  /**
   * 获取单个域名详情
   */
  abstract getDomainInfo(domain: string): Promise<DNSOperationResult<DomainInfo>>

  /**
   * 同步域名（从服务商获取最新信息并更新本地数据库）
   */
  abstract syncDomains(): Promise<SyncResult>

  /**
   * 获取域名的 DNS 记录
   */
  abstract getDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>>

  /**
   * 同步域名的 DNS 记录
   */
  abstract syncDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>>
}

/**
 * 域名续期结果
 */
export interface RenewalResult {
  success: boolean
  error?: string
  newExpiryDate?: string
  orderId?: string
}

/**
 * 域名续期器抽象基类
 * 提供域名续期的标准接口
 */
export abstract class DomainRenewer {
  abstract readonly id: string
  abstract readonly name: string

  protected apiKey?: string
  protected apiSecret?: string

  // API 客户端（可选，由具体实现注入）
  protected apiClient?: BaseApiClient

  constructor(config: { apiKey?: string, apiSecret?: string, apiClient?: BaseApiClient }) {
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
    this.apiClient = config.apiClient
  }

  /**
   * 验证配置是否完整
   */
  abstract validateConfig(): boolean

  /**
   * 执行域名续期
   * @param domain 域名
   * @param years 续期年数（默认1年）
   */
  abstract renewDomain(domain: string, years?: number): Promise<RenewalResult>

  /**
   * 查询域名可续期状态
   * @param domain 域名
   */
  abstract checkRenewalEligibility(domain: string): Promise<{
    eligible: boolean
    reason?: string
    currentExpiryDate?: string
    maxRenewalYears?: number
  }>
}

/**
 * DNS 提供商工厂
 * 根据类型创建对应的 DNS 提供商实例
 */
export class DNSProviderFactory {
  private static providers: Map<string, new (config: any) => DNSProvider> = new Map()
  private static syncers: Map<string, new (config: any) => DomainSyncer> = new Map()
  private static renewers: Map<string, new (config: any) => DomainRenewer> = new Map()

  /**
   * 注册 DNS 提供商
   */
  static registerProvider(id: string, provider: new (config: any) => DNSProvider) {
    this.providers.set(id, provider)
  }

  /**
   * 注册域名同步器
   */
  static registerSyncer(id: string, syncer: new (config: any) => DomainSyncer) {
    this.syncers.set(id, syncer)
  }

  /**
   * 注册域名续期器
   */
  static registerRenewer(id: string, renewer: new (config: any) => DomainRenewer) {
    this.renewers.set(id, renewer)
  }

  /**
   * 创建 DNS 提供商实例
   */
  static createProvider(id: string, config: any): DNSProvider | null {
    const Provider = this.providers.get(id)
    if (!Provider) {
      return null
    }
    return new Provider(config)
  }

  /**
   * 创建域名同步器实例
   */
  static createSyncer(id: string, config: any): DomainSyncer | null {
    const Syncer = this.syncers.get(id)
    if (!Syncer) {
      return null
    }
    return new Syncer(config)
  }

  /**
   * 创建域名续期器实例
   */
  static createRenewer(id: string, config: any): DomainRenewer | null {
    const Renewer = this.renewers.get(id)
    if (!Renewer) {
      return null
    }
    return new Renewer(config)
  }

  /**
   * 获取所有已注册的提供商 ID
   */
  static getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  /**
   * 获取所有已注册的同步器 ID
   */
  static getRegisteredSyncers(): string[] {
    return Array.from(this.syncers.keys())
  }

  /**
   * 获取所有已注册的续期器 ID
   */
  static getRegisteredRenewers(): string[] {
    return Array.from(this.renewers.keys())
  }
}
