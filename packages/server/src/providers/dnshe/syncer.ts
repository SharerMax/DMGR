/**
 * DNSHE 域名同步器实现
 *
 * 从 DNSHE API 同步子域名列表及其 DNS 记录。
 * DNSHE 管理的是子域名（如 myhost.example.com），在本系统中作为域名管理。
 */

import type { DNSOperationResult, DNSRecordOutput, DomainInfo, SyncResult } from '../base'
import type { DnsheDNSRecord, DnsheSubdomain } from './apiClient'
import { DNSProviderFactory, DomainSyncer } from '../base'
import { DnsheApiClient } from './apiClient'

interface DnsheSyncerConfig {
  apiKey: string
  apiSecret: string
  apiUrl?: string
}

export class DnsheSyncer extends DomainSyncer {
  readonly id = 'dnshe'
  readonly name = 'DNSHE'

  private apiClient: DnsheApiClient

  constructor(config: DnsheSyncerConfig) {
    super(config)
    this.apiClient = new DnsheApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient
  }

  async getAccountInfo(): Promise<DNSOperationResult<any>> {
    return { success: true, data: { provider: 'dnshe' } }
  }

  async listDomains(): Promise<DNSOperationResult<DomainInfo[]>> {
    const response = await this.apiClient.listSubdomains()

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || '获取域名列表失败',
      }
    }

    const domains: DomainInfo[] = response.data.subdomains.map((subdomain: DnsheSubdomain) => ({
      name: subdomain.full_domain,
      status: subdomain.status,
      expirationDate: subdomain.expires_at ?? null,
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
    const subdomainResult = await this.apiClient.findSubdomainIdByDomain(domain)
    if (!subdomainResult.success || !subdomainResult.data) {
      return { success: false, error: subdomainResult.error }
    }

    const recordsResponse = await this.apiClient.listDNSRecords(subdomainResult.data)
    if (!recordsResponse.success || !recordsResponse.data) {
      return { success: false, error: recordsResponse.error || '获取 DNS 记录失败' }
    }

    const records: DNSRecordOutput[] = recordsResponse.data.map((record: DnsheDNSRecord) => ({
      id: record.id.toString(),
      type: record.type,
      name: record.name,
      value: record.content,
      ttl: record.ttl,
      priority: record.priority ?? null,
      line: record.line ?? undefined,
      createdAt: record.created_at || '',
      updatedAt: record.updated_at || '',
    }))

    return { success: true, data: records }
  }

  async syncDomainRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    return this.getDomainRecords(domain)
  }
}

DNSProviderFactory.registerSyncer('dnshe', DnsheSyncer)
