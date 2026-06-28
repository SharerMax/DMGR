/**
 * DNSPod 域名同步器实现
 */

import type {
  DNSOperationResult,
  DNSRecordOutput,
  DomainInfo,
  SyncResult,
} from '../base'
import { DNSProviderFactory, DomainSyncer } from '../base'
import { DnspodApiClient } from './apiClient'

interface DnspodConfig {
  loginToken: string
  apiUrl?: string
}

export class DnspodSyncer extends DomainSyncer {
  readonly id = 'dnspod'
  readonly name = 'DNSPod'

  private apiClient: DnspodApiClient

  constructor(config: DnspodConfig) {
    super(config)
    this.apiClient = new DnspodApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient
  }

  async getAccountInfo(): Promise<DNSOperationResult<any>> {
    const response = await this.apiClient.listDomains()

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
    const response = await this.apiClient.listDomains()

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取域名列表失败',
        code: response.code,
      }
    }

    const raw: any = response.data
    const domains: DomainInfo[] = (raw?.domains || []).map((domain: any) => ({
      name: domain.name || domain.punycode,
      status: domain.status || 'active',
      expirationDate: domain.ext_status || '',
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

    const raw: any = response.data
    const domainData = raw?.domain || {}
    return {
      success: true,
      data: {
        name: domainData.name || domain,
        status: domainData.status || 'active',
        expirationDate: domainData.ext_status || '',
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
    const response = await this.apiClient.listRecords(domain)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取 DNS 记录失败',
        code: response.code,
      }
    }

    const raw: any = response.data
    const records: DNSRecordOutput[] = (raw?.records || []).map(
      (record: any) => ({
        id: String(record.id),
        type: record.type || record.record_type,
        name: record.name || record.sub_domain,
        value: record.value,
        ttl: Number(record.ttl) || 600,
        priority: record.mx ? Number(record.mx) : null,
        line: record.line,
        createdAt: record.created_on || '',
        updatedAt: record.updated_on || '',
      }),
    )

    return { success: true, data: records }
  }

  async syncDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    return this.getDomainRecords(domain)
  }
}

DNSProviderFactory.registerSyncer('dnspod', DnspodSyncer)
