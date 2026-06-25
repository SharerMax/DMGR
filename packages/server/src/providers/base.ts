/**
 * DNS Provider 抽象基类
 * 定义 DNS 记录管理和域名同步的接口规范
 * 后续可以继承此类实现具体的 DNS 服务商
 */

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
  status: 'ENABLE' | 'DISABLE'
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

  constructor(config: { apiUrl?: string, apiKey?: string, apiSecret?: string }) {
    this.apiUrl = config.apiUrl
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
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

  /**
   * 设置 DNS 记录状态（启用/禁用）
   */
  abstract setDNSRecordStatus(
    domain: string,
    recordId: string,
    status: 'ENABLE' | 'DISABLE'
  ): Promise<DNSOperationResult>

  /**
   * 批量操作 DNS 记录
   */
  abstract batchUpdateDNSRecords(
    domain: string,
    records: Array<{ id: string, data: Partial<DNSRecordInput> }>
  ): Promise<DNSOperationResult>
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
  protected apiUrl?: string
  protected apiKey?: string
  protected apiSecret?: string

  constructor(config: { apiUrl?: string, apiKey?: string, apiSecret?: string }) {
    this.apiUrl = config.apiUrl
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
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
 * DNS 提供商工厂
 * 根据类型创建对应的 DNS 提供商实例
 */
export class DNSProviderFactory {
  private static providers: Map<string, new (config: any) => DNSProvider> = new Map()
  private static syncers: Map<string, new (config: any) => DomainSyncer> = new Map()

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
}
