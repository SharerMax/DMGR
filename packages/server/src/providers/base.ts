/**
 * DNS Provider 抽象基类
 * 定义 DNS 记录管理和域名同步的接口规范
 * 后续可以继承此类实现具体的 DNS 服务商
 */

import type { ProviderFeatures, ProviderField } from 'share'

export type { ProviderFeatures, ProviderField }

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
  expirationDate?: string | null
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
 * 服务商配置
 */
export interface ProviderConfig {
  id: string
  name: string
  description?: string
  fields: ProviderField[]
  features: ProviderFeatures
  maxRenewalDays?: number // 过期前最大可续期天数（仅 features.autoRenew=true 时有效）
}

/**
 * DNS Provider 抽象基类
 * 提供 DNS 记录管理的标准接口
 */
export abstract class DNSProvider {
  // 提供商标识
  abstract readonly id: string
  abstract readonly name: string

  constructor(_config: Record<string, any>) {
    // 由具体子类处理配置
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
}

/**
 * 域名同步器抽象基类
 * 提供域名同步的标准接口
 */
export abstract class DomainSyncer {
  // 提供商标识
  abstract readonly id: string
  abstract readonly name: string

  constructor(_config: Record<string, any>) {
    // 由具体子类处理配置
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

  constructor(_config: Record<string, any>) {
    // 由具体子类处理配置
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
