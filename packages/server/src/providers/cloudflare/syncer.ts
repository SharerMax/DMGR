/**
 * Cloudflare 域名同步器实现
 */

import type {
  DNSOperationResult,
  DNSRecordOutput,
  DomainInfo,
  SyncResult,
} from '../base'
import { DNSProviderFactory, DomainSyncer } from '../base'
import { CloudflareApiClient } from './apiClient'

interface CloudflareConfig {
  apiToken: string
  email?: string
  apiUrl?: string
}

export class CloudflareSyncer extends DomainSyncer {
  readonly id = 'cloudflare'
  readonly name = 'Cloudflare'

  private apiClient: CloudflareApiClient

  constructor(config: CloudflareConfig) {
    super(config)
    this.apiClient = new CloudflareApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient
  }

  async getAccountInfo(): Promise<DNSOperationResult<any>> {
    const response = await this.apiClient.listZones(1)

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
    const response = await this.apiClient.listZones()

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取域名列表失败',
        code: response.code,
      }
    }

    const zones: any[] = Array.isArray(response.data) ? response.data : []
    const domains: DomainInfo[] = zones.map((zone: any) => ({
      name: zone.name,
      status: zone.status || 'active',
      expirationDate: null,
      dnsServers: zone.name_servers || [],
    }))

    return { success: true, data: domains }
  }

  async getDomainInfo(domain: string): Promise<DNSOperationResult<DomainInfo>> {
    const response = await this.apiClient.listZones(100)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取域名详情失败',
        code: response.code,
      }
    }

    const zones: any[] = Array.isArray(response.data) ? response.data : []
    const zone = zones.find((z: any) => z.name === domain)

    if (!zone) {
      return {
        success: false,
        error: `未在 Cloudflare 账户中找到域名 ${domain}`,
      }
    }

    return {
      success: true,
      data: {
        name: zone.name,
        status: zone.status || 'active',
        expirationDate: null,
        dnsServers: zone.name_servers || [],
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
    const zonesResponse = await this.apiClient.listZones(100)
    if (!zonesResponse.success) {
      return {
        success: false,
        error: zonesResponse.error || '获取 Zone 列表失败',
        code: zonesResponse.code,
      }
    }

    const zones: any[] = Array.isArray(zonesResponse.data) ? zonesResponse.data : []
    const zone = zones.find((z: any) => z.name === domain || domain.endsWith(`.${z.name}`))

    if (!zone) {
      return {
        success: false,
        error: `未在 Cloudflare 账户中找到域名 ${domain} 对应的 Zone`,
      }
    }

    const response = await this.apiClient.listDnsRecords(zone.id)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取 DNS 记录失败',
        code: response.code,
      }
    }

    const records: DNSRecordOutput[] = (Array.isArray(response.data) ? response.data : []).map(
      (record: any) => ({
        id: record.id,
        type: record.type,
        name: record.name,
        value: record.content,
        ttl: record.ttl,
        priority: record.priority || null,
        createdAt: record.created_on,
        updatedAt: record.modified_on,
      }),
    )

    return { success: true, data: records }
  }

  async syncDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    return this.getDomainRecords(domain)
  }
}

DNSProviderFactory.registerSyncer('cloudflare', CloudflareSyncer)
