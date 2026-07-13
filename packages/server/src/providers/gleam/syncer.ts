/**
 * Gleam 域名同步器实现
 *
 * 从 Gleam API 同步子域名列表及其 DNS 记录。
 * Gleam 管理的是子域名（如 myhost.example.com），在本系统中作为域名管理。
 */

import type { DNSOperationResult, DNSRecordOutput, DomainInfo, SyncResult } from '../base'
import type { GleamDNSRecord, GleamSubdomain } from './apiClient'
import { DNSProviderFactory, DomainSyncer } from '../base'
import { GleamApiClient } from './apiClient'

interface GleamSyncerConfig {
  apiKey: string
  apiUrl?: string
}

export class GleamSyncer extends DomainSyncer {
  readonly id = 'gleam'
  readonly name = 'Gleam'

  private apiClient: GleamApiClient

  constructor(config: GleamSyncerConfig) {
    super(config)
    this.apiClient = new GleamApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient
  }

  async getAccountInfo(): Promise<DNSOperationResult<any>> {
    return { success: true, data: { provider: 'gleam' } }
  }

  async listDomains(): Promise<DNSOperationResult<DomainInfo[]>> {
    const response = await this.apiClient.listSubdomains()

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || '获取域名列表失败',
      }
    }

    const domains: DomainInfo[] = response.data.map((subdomain: GleamSubdomain) => ({
      name: subdomain.fqdn,
      status: subdomain.status,
    }))

    return { success: true, data: domains }
  }

  async getDomainInfo(domain: string): Promise<DNSOperationResult<DomainInfo>> {
    const listResult = await this.listDomains()
    if (!listResult.success || !listResult.data) {
      return { success: false, error: listResult.error }
    }

    const found = listResult.data.find(d => d.name === domain)
    if (!found) {
      return { success: false, error: `未找到域名 ${domain}` }
    }

    return { success: true, data: found }
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
    // 先找到子域名 ID
    const subdomainsResponse = await this.apiClient.listSubdomains()
    if (!subdomainsResponse.success || !subdomainsResponse.data) {
      return { success: false, error: subdomainsResponse.error || '获取子域名列表失败' }
    }

    const subdomain = subdomainsResponse.data.find(
      (s: GleamSubdomain) => s.fqdn === domain || s.name === domain,
    )

    if (!subdomain) {
      return { success: false, error: `未找到域名 ${domain} 对应的子域名` }
    }

    const recordsResponse = await this.apiClient.listDNSRecords(subdomain.id)
    if (!recordsResponse.success || !recordsResponse.data) {
      return { success: false, error: recordsResponse.error || '获取 DNS 记录失败' }
    }

    const records: DNSRecordOutput[] = recordsResponse.data.map((record: GleamDNSRecord) => ({
      id: record.id.toString(),
      type: record.type,
      name: record.name,
      value: record.content,
      ttl: record.ttl,
      priority: null,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }))

    return { success: true, data: records }
  }

  async syncDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    return this.getDomainRecords(domain)
  }
}

DNSProviderFactory.registerSyncer('gleam', GleamSyncer)
