/**
 * 阿里云域名同步器实现
 *
 * 使用示例：
 *
 * ```typescript
 * import { AliyunSyncer } from './syncer'
 *
 * const syncer = new AliyunSyncer({
 *   apiKey: 'your-access-key-id',
 *   apiSecret: 'your-access-key-secret',
 * })
 *
 * // 同步所有域名
 * const result = await syncer.syncDomains()
 *
 * // 获取域名列表
 * const domains = await syncer.listDomains()
 * ```
 */

import type {
  DNSOperationResult,
  DNSRecordOutput,
  DomainInfo,
  SyncResult,
} from '../base'
import {
  DNSProviderFactory,
  DomainSyncer,
} from '../base'
import { AliyunApiClient } from './apiClient'

interface AliyunConfig {
  apiKey: string
  apiSecret: string
  region?: string
  apiUrl?: string
}

interface AliyunDomain {
  DomainName: string
  DomainId: string
  AliDomain: boolean
  Registrar?: string
  RegistrationDate?: string
  ExpirationDate?: string
  DomainType?: string
  DNSServers?: {
    DnsServer: string
  }[]
}

interface AliyunRecord {
  RecordId: string
  RR: string
  Type: string
  Value: string
  TTL: number
  Priority?: number
  Line?: string
  Status: string
  Locked: boolean
  Weight?: number
  Remark?: string
  createTime: string
  updateTime: string
}

/**
 * 阿里云域名同步器实现
 */
export class AliyunSyncer extends DomainSyncer {
  readonly id = 'aliyun'
  readonly name = '阿里云'

  private config: AliyunConfig
  protected declare apiClient?: AliyunApiClient

  constructor(config: AliyunConfig) {
    const apiClient = new AliyunApiClient(config)
    super({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      apiClient,
    })
    this.config = {
      region: 'cn-hangzhou',
      ...config,
    }
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.apiSecret)
  }

  async getAccountInfo(): Promise<DNSOperationResult<any>> {
    const response = await this.apiClient!.request('DescribeDomainInfo', {})

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取账户信息失败',
        code: response.code,
      }
    }

    return {
      success: true,
      data: response.data,
    }
  }

  async listDomains(): Promise<DNSOperationResult<DomainInfo[]>> {
    const response = await this.apiClient!.request<{ Domains?: { Domain: AliyunDomain[] } }>(
      'DescribeDomains',
      { PageSize: 500 },
    )

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取域名列表失败',
        code: response.code,
      }
    }

    const domains: DomainInfo[] = (response.data?.Domains?.Domain || []).map(
      (domain: AliyunDomain) => ({
        name: domain.DomainName,
        registrar: domain.Registrar,
        registrationDate: domain.RegistrationDate,
        expirationDate: domain.ExpirationDate || '',
        status: domain.DomainType || 'active',
        dnsServers: domain.DNSServers?.map(d => d.DnsServer),
      }),
    )

    return {
      success: true,
      data: domains,
    }
  }

  async getDomainInfo(domain: string): Promise<DNSOperationResult<DomainInfo>> {
    const response = await this.apiClient!.request<AliyunDomain>('DescribeDomainInfo', {
      DomainName: domain,
    })

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取域名详情失败',
        code: response.code,
      }
    }

    const domainData = response.data as any
    return {
      success: true,
      data: {
        name: domainData?.DomainName || domain,
        registrar: domainData?.Registrar,
        registrationDate: domainData?.RegistrationDate,
        expirationDate: domainData?.ExpirationDate || '',
        status: domainData?.DomainType || 'active',
        dnsServers: domainData?.DNSServers?.map((d: any) => d.DnsServer),
      },
    }
  }

  async syncDomains(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      domains: [],
      errors: [],
    }

    if (!this.validateConfig()) {
      result.errors?.push('API 配置不完整')
      return result
    }

    const listResult = await this.listDomains()

    if (!listResult.success || !listResult.data) {
      result.errors?.push(listResult.error || '获取域名列表失败')
      return result
    }

    result.domains = listResult.data
    result.success = true
    return result
  }

  async getDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    const response = await this.apiClient!.request<{ RecordIds?: { RecordId: AliyunRecord[] } }>(
      'DescribeDomainRecords',
      { DomainName: domain, PageSize: 500 },
    )

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取 DNS 记录失败',
        code: response.code,
      }
    }

    const records: DNSRecordOutput[] = (response.data?.RecordIds?.RecordId || []).map(
      (record: AliyunRecord) => ({
        id: record.RecordId,
        type: record.Type,
        name: record.RR,
        value: record.Value,
        ttl: record.TTL,
        priority: record.Priority || null,
        line: record.Line,
        createdAt: record.createTime,
        updatedAt: record.updateTime,
      }),
    )

    return {
      success: true,
      data: records,
    }
  }

  async syncDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    return this.getDomainRecords(domain)
  }
}

// 注册到工厂
DNSProviderFactory.registerSyncer('aliyun', AliyunSyncer)
