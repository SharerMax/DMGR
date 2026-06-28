/**
 * 腾讯云域名同步器实现
 */

import type {
  DNSOperationResult,
  DNSRecordOutput,
  DomainInfo,
  SyncResult,
} from '../base'
import { DNSProviderFactory, DomainSyncer } from '../base'
import { TencentApiClient } from './apiClient'

interface TencentConfig {
  secretId: string
  secretKey: string
  region?: string
  apiUrl?: string
}

export class TencentSyncer extends DomainSyncer {
  readonly id = 'tencent'
  readonly name = '腾讯云'

  private apiClient: TencentApiClient

  constructor(config: TencentConfig) {
    super(config)
    this.apiClient = new TencentApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient
  }

  async getAccountInfo(): Promise<DNSOperationResult<any>> {
    const response = await this.apiClient.describeDomainList(1)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取账户信息失败',
        code: response.code,
      }
    }

    return { success: true, data: response.data }
  }

  async listDomains(): Promise<DNSOperationResult<DomainInfo[]>> {
    const response = await this.apiClient.describeDomainList()

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取域名列表失败',
        code: response.code,
      }
    }

    const domains: DomainInfo[] = (response.data?.DomainList || []).map(
      (domain: any) => ({
        name: domain.Name,
        expirationDate: domain.ExpirationDate || '',
        status: domain.Status || 'active',
        dnsServers: [],
      }),
    )

    return { success: true, data: domains }
  }

  async getDomainInfo(domain: string): Promise<DNSOperationResult<DomainInfo>> {
    const response = await this.apiClient.describeDomain(domain)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取域名详情失败',
        code: response.code,
      }
    }

    const domainData: any = response.data
    return {
      success: true,
      data: {
        name: domainData?.Name || domain,
        expirationDate: domainData?.ExpirationDate || '',
        status: domainData?.Status || 'active',
        dnsServers: [],
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
    const response = await this.apiClient.describeRecordList(domain)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取 DNS 记录失败',
        code: response.code,
      }
    }

    const records: DNSRecordOutput[] = (response.data?.RecordList || []).map(
      (record: any) => ({
        id: String(record.RecordId),
        type: record.Type,
        name: record.Name,
        value: record.Value,
        ttl: record.TTL,
        priority: record.Priority || null,
        line: record.Line,
        createdAt: '',
        updatedAt: record.UpdatedOn || '',
      }),
    )

    return { success: true, data: records }
  }

  async syncDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    return this.getDomainRecords(domain)
  }
}

DNSProviderFactory.registerSyncer('tencent', TencentSyncer)
