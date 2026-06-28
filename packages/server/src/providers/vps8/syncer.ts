import type { DNSOperationResult, DNSRecordOutput, DomainInfo, SyncResult } from '../base'
import type { VPS8DNSRecord } from './apiClient'
import { DNSProviderFactory, DomainSyncer } from '../base'
import { VPS8ApiClient } from './apiClient'

interface VPS8Config {
  apiKey: string
  apiUrl?: string
}

export class VPS8Syncer extends DomainSyncer {
  readonly id: string = 'vps8'
  readonly name: string = 'VPS8'

  private apiClient: VPS8ApiClient

  constructor(config: VPS8Config) {
    super(config)
    this.apiClient = new VPS8ApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient
  }

  getAccountInfo(): Promise<DNSOperationResult<any>> {
    throw new Error('Method not implemented.')
  }

  async listDomains(): Promise<DNSOperationResult<DomainInfo[]>> {
    const response = await this.apiClient.listDomains()

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取域名列表失败',
      }
    }

    return {
      success: true,
      data: (response.data || []).map((domain) => {
        if (domain.platform_type === 'self_platform') {
          return {
            name: domain.domain,
            expirationDate: domain.expires_at,
            status: 'active',
          }
        }
        return {
          name: domain.domain,
          expirationDate: '1970-01-01 00:00:00',
          status: 'active',
        }
      }),
    }
  }

  getDomainInfo(_domain: string): Promise<DNSOperationResult<DomainInfo>> {
    throw new Error('Method not implemented.')
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

    const domains = await this.listDomains()
    if (!domains.success || !domains.data) {
      result.errors?.push(domains.error || '获取域名列表失败')
      return result
    }
    result.domains = domains.data
    result.success = true
    return result
  }

  async getDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    const response = await this.apiClient.listRecords(domain)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取 DNS 记录失败',
      }
    }

    const records: DNSRecordOutput[] = (response.data || []).map(
      (record: VPS8DNSRecord) => ({
        id: String(record.id),
        type: record.type,
        name: record.host,
        value: record.value,
        ttl: record.ttl,
        priority: record.priority || null,
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

DNSProviderFactory.registerSyncer('vps8', VPS8Syncer)
