/**
 * DNSHE DNS Provider 实现
 *
 * 提供 DNS 记录管理功能（增删改查）。
 * DNSHE 管理的是子域名（如 myhost.example.com），通过子域名 ID 管理 DNS 记录。
 */

import type { DNSOperationResult, DNSRecordInput, DNSRecordOutput } from '../base'
import type { DnsheDNSRecord } from './apiClient'
import { DNSProvider, DNSProviderFactory } from '../base'
import { DnsheApiClient } from './apiClient'

interface DnsheProviderConfig {
  apiKey: string
  apiSecret: string
  apiUrl?: string
}

export class DnsheDNSProvider extends DNSProvider {
  readonly id = 'dnshe'
  readonly name = 'DNSHE'

  private apiClient: DnsheApiClient
  private apiKey: string
  private apiSecret: string

  constructor(config: DnsheProviderConfig) {
    super(config)
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
    this.apiClient = new DnsheApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient && !!this.apiKey && !!this.apiSecret
  }

  /**
   * 将 DNSHE DNS 记录转换为标准输出格式
   */
  private mapRecord(record: DnsheDNSRecord): DNSRecordOutput {
    return {
      id: record.id.toString(),
      type: record.type,
      name: record.name,
      value: record.content,
      ttl: record.ttl,
      priority: record.priority ?? null,
      line: record.line ?? undefined,
      createdAt: record.created_at || '',
      updatedAt: record.updated_at || '',
    }
  }

  async getDNSRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    const subdomainResult = await this.apiClient.findSubdomainIdByDomain(domain)
    if (!subdomainResult.success || !subdomainResult.data) {
      return { success: false, error: subdomainResult.error }
    }

    const response = await this.apiClient.listDNSRecords(subdomainResult.data)
    if (!response.success || !response.data) {
      return { success: false, error: response.error || '获取 DNS 记录失败' }
    }

    return { success: true, data: response.data.map(this.mapRecord) }
  }

  async addDNSRecord(domain: string, record: DNSRecordInput): Promise<DNSOperationResult<DNSRecordOutput>> {
    const subdomainResult = await this.apiClient.findSubdomainIdByDomain(domain)
    if (!subdomainResult.success || !subdomainResult.data) {
      return { success: false, error: subdomainResult.error }
    }

    const response = await this.apiClient.createDNSRecord(subdomainResult.data, {
      type: record.type,
      name: record.name,
      content: record.value,
      ttl: record.ttl,
      priority: record.priority ?? undefined,
      line: record.line,
    })

    if (!response.success || !response.data) {
      return { success: false, error: response.error || '创建 DNS 记录失败' }
    }

    return { success: true, data: this.mapRecord(response.data) }
  }

  async updateDNSRecord(
    domain: string,
    recordId: string,
    record: Partial<DNSRecordInput>,
  ): Promise<DNSOperationResult<DNSRecordOutput>> {
    const subdomainResult = await this.apiClient.findSubdomainIdByDomain(domain)
    if (!subdomainResult.success || !subdomainResult.data) {
      return { success: false, error: subdomainResult.error }
    }

    const response = await this.apiClient.updateDNSRecord(
      subdomainResult.data,
      Number(recordId),
      {
        type: record.type,
        name: record.name,
        content: record.value,
        ttl: record.ttl,
        priority: record.priority ?? undefined,
        line: record.line,
      },
    )

    if (!response.success || !response.data) {
      return { success: false, error: response.error || '更新 DNS 记录失败' }
    }

    return { success: true, data: this.mapRecord(response.data) }
  }

  async deleteDNSRecord(domain: string, recordId: string): Promise<DNSOperationResult> {
    const response = await this.apiClient.deleteDNSRecord(Number(recordId))

    if (!response.success) {
      return { success: false, error: response.error || '删除 DNS 记录失败' }
    }

    return { success: true, data: {} }
  }
}

DNSProviderFactory.registerProvider('dnshe', DnsheDNSProvider)
