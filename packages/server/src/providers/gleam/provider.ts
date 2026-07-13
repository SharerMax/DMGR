/**
 * Gleam DNS Provider 实现
 *
 * 提供 DNS 记录管理功能（增删改查）。
 * Gleam 的 DNS 记录通过子域名 ID 管理，需要先根据域名查找对应的子域名 ID。
 */

import type { DNSOperationResult, DNSRecordInput, DNSRecordOutput } from '../base'
import type { GleamDNSRecord, GleamSubdomain } from './apiClient'
import { DNSProvider, DNSProviderFactory } from '../base'
import { GleamApiClient } from './apiClient'

interface GleamProviderConfig {
  apiKey: string
  apiUrl?: string
}

export class GleamDNSProvider extends DNSProvider {
  readonly id = 'gleam'
  readonly name = 'Gleam'

  private apiClient: GleamApiClient
  private apiKey: string

  constructor(config: GleamProviderConfig) {
    super(config)
    this.apiKey = config.apiKey
    this.apiClient = new GleamApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient && !!this.apiKey
  }

  /**
   * 根据域名查找子域名 ID
   * Gleam 管理的是子域名，需要通过 fqdn 匹配
   */
  private async findSubdomainId(domain: string): Promise<DNSOperationResult<number>> {
    const response = await this.apiClient.listSubdomains()
    if (!response.success || !response.data) {
      return { success: false, error: response.error || '获取子域名列表失败' }
    }

    const subdomain = response.data.find((s: GleamSubdomain) =>
      s.fqdn === domain || s.name === domain,
    )

    if (!subdomain) {
      return { success: false, error: `未找到域名 ${domain} 对应的子域名` }
    }

    return { success: true, data: subdomain.id }
  }

  /**
   * 将 Gleam DNS 记录转换为标准输出格式
   */
  private mapRecord(record: GleamDNSRecord): DNSRecordOutput {
    return {
      id: record.id.toString(),
      type: record.type,
      name: record.name,
      value: record.content,
      ttl: record.ttl,
      priority: null,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }
  }

  async getDNSRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    const subdomainResult = await this.findSubdomainId(domain)
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
    const subdomainResult = await this.findSubdomainId(domain)
    if (!subdomainResult.success || !subdomainResult.data) {
      return { success: false, error: subdomainResult.error }
    }

    const response = await this.apiClient.createDNSRecord(subdomainResult.data, {
      type: record.type,
      content: record.value,
      proxied: false,
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
    const subdomainResult = await this.findSubdomainId(domain)
    if (!subdomainResult.success || !subdomainResult.data) {
      return { success: false, error: subdomainResult.error }
    }

    if (!record.value) {
      return { success: false, error: '更新 DNS 记录需要提供 content 值' }
    }

    const response = await this.apiClient.updateDNSRecord(
      subdomainResult.data,
      Number(recordId),
      { content: record.value },
    )

    if (!response.success || !response.data) {
      return { success: false, error: response.error || '更新 DNS 记录失败' }
    }

    return { success: true, data: this.mapRecord(response.data) }
  }

  async deleteDNSRecord(domain: string, recordId: string): Promise<DNSOperationResult> {
    const subdomainResult = await this.findSubdomainId(domain)
    if (!subdomainResult.success || !subdomainResult.data) {
      return { success: false, error: subdomainResult.error }
    }

    const response = await this.apiClient.deleteDNSRecord(
      subdomainResult.data,
      Number(recordId),
    )

    if (!response.success) {
      return { success: false, error: response.error || '删除 DNS 记录失败' }
    }

    return { success: true, data: {} }
  }
}

DNSProviderFactory.registerProvider('gleam', GleamDNSProvider)
