import type { DNSOperationResult, DNSRecordOutput, DomainInfo, SyncResult } from '../base'
import { DNSProviderFactory, DomainSyncer } from '../base'
import { VPS8ApiClient } from './apiClient'

interface VPS8Config {
  apiKey: string
  apiUrl?: string
}

interface VPS8SelfPlatformDomain {
  domain: string
  platform_type: string
  source_service: string
  created_at: string
  expires_at: string
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
      data: (response.data || []).map(domain => ({
        name: domain.domain,
        expirationDate: (domain as VPS8SelfPlatformDomain).expires_at || '',
        status: domain.platform_type === 'self_platform' ? 'active' : 'inactive',
      })),
    }
  }

  getDomainInfo(_domain: string): Promise<DNSOperationResult<DomainInfo>> {
    throw new Error('Method not implemented.')
  }

  syncDomains(): Promise<SyncResult> {
    throw new Error('Method not implemented.')
  }

  getDomainRecords(_domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    throw new Error('Method not implemented.')
  }

  syncDomainRecords(_domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    throw new Error('Method not implemented.')
  }
}

DNSProviderFactory.registerSyncer('vps8', VPS8Syncer)
