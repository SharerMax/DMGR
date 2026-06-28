/**
 * Namecheap 域名同步器实现
 */

import type {
  DNSOperationResult,
  DNSRecordOutput,
  DomainInfo,
  SyncResult,
} from '../base'
import { DNSProviderFactory, DomainSyncer } from '../base'
import { NamecheapApiClient } from './apiClient'

interface NamecheapConfig {
  apiUser: string
  apiKey: string
  clientIp: string
  apiUrl?: string
}

export class NamecheapSyncer extends DomainSyncer {
  readonly id = 'namecheap'
  readonly name = 'Namecheap'

  private apiClient: NamecheapApiClient

  constructor(config: NamecheapConfig) {
    super(config)
    this.apiClient = new NamecheapApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient
  }

  async getAccountInfo(): Promise<DNSOperationResult<any>> {
    const response = await this.apiClient.getDomains(1)

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
    const response = await this.apiClient.getDomains()

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取域名列表失败',
        code: response.code,
      }
    }

    const domains: DomainInfo[] = (response.data || []).map((domain: any) => ({
      name: domain.Name,
      status: domain.IsExpired ? 'expired' : 'active',
      expirationDate: domain.Expires || '',
      dnsServers: [],
    }))

    return { success: true, data: domains }
  }

  async getDomainInfo(domain: string): Promise<DNSOperationResult<DomainInfo>> {
    const response = await this.apiClient.getDomainInfo(domain)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取域名详情失败',
        code: response.code,
      }
    }

    const data = response.data as any
    return {
      success: true,
      data: {
        name: data?.Name || domain,
        status: data?.IsExpired ? 'expired' : 'active',
        expirationDate: data?.Expires || '',
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
    const response = await this.apiClient.getHosts(domain)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取 DNS 记录失败',
        code: response.code,
      }
    }

    const records: DNSRecordOutput[] = (response.data || []).map(
      (record: any) => ({
        id: String(record.HostId || `${record.Name}-${record.Type}-${record.Address}`),
        type: record.Type,
        name: record.Name,
        value: record.Address,
        ttl: Number(record.TTL) || 1800,
        priority: record.MXPref !== undefined ? Number(record.MXPref) : null,
        createdAt: '',
        updatedAt: '',
      }),
    )

    return { success: true, data: records }
  }

  async syncDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    return this.getDomainRecords(domain)
  }
}

DNSProviderFactory.registerSyncer('namecheap', NamecheapSyncer)
