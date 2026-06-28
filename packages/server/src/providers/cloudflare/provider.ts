/**
 * Cloudflare DNS Provider 实现
 *
 * Cloudflare 以 Zone 为单位管理 DNS 记录。本 provider 通过域名匹配获取 zoneId 后调用 API。
 */

import type {
  DNSOperationResult,
  DNSRecordInput,
  DNSRecordOutput,
} from '../base'
import { DNSProvider, DNSProviderFactory } from '../base'
import { CloudflareApiClient } from './apiClient'

interface CloudflareConfig {
  apiToken: string
  email?: string
  apiUrl?: string
}

export class CloudflareDNSProvider extends DNSProvider {
  readonly id = 'cloudflare'
  readonly name = 'Cloudflare'

  private apiClient: CloudflareApiClient
  private zoneIdCache: Map<string, string> = new Map()

  constructor(config: CloudflareConfig) {
    super(config)
    this.apiClient = new CloudflareApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient
  }

  /**
   * 根据域名获取对应的 Zone ID
   */
  private async findZoneId(domain: string): Promise<DNSOperationResult<string>> {
    const cached = this.zoneIdCache.get(domain)
    if (cached) {
      return { success: true, data: cached }
    }

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

    this.zoneIdCache.set(domain, zone.id)
    return { success: true, data: zone.id }
  }

  async getDNSRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    const zoneResult = await this.findZoneId(domain)
    if (!zoneResult.success || !zoneResult.data) {
      return { success: false, error: zoneResult.error, code: zoneResult.code }
    }

    const response = await this.apiClient.listDnsRecords(zoneResult.data)

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

  async addDNSRecord(domain: string, record: DNSRecordInput): Promise<DNSOperationResult<DNSRecordOutput>> {
    const zoneResult = await this.findZoneId(domain)
    if (!zoneResult.success || !zoneResult.data) {
      return { success: false, error: zoneResult.error, code: zoneResult.code }
    }

    const response = await this.apiClient.createDnsRecord(zoneResult.data, {
      type: record.type,
      name: record.name,
      content: record.value,
      ttl: record.ttl,
      priority: record.priority ?? undefined,
    })

    if (!response.success) {
      return {
        success: false,
        error: response.error || '添加 DNS 记录失败',
        code: response.code,
      }
    }

    const data = response.data as any
    return {
      success: true,
      data: {
        id: data?.id || '',
        type: data?.type || record.type,
        name: data?.name || record.name,
        value: data?.content || record.value,
        ttl: data?.ttl || record.ttl || 1,
        priority: data?.priority || record.priority || null,
        createdAt: data?.created_on || new Date().toISOString(),
        updatedAt: data?.modified_on || new Date().toISOString(),
      },
    }
  }

  async updateDNSRecord(
    domain: string,
    recordId: string,
    record: Partial<DNSRecordInput>,
  ): Promise<DNSOperationResult<DNSRecordOutput>> {
    const zoneResult = await this.findZoneId(domain)
    if (!zoneResult.success || !zoneResult.data) {
      return { success: false, error: zoneResult.error, code: zoneResult.code }
    }

    const response = await this.apiClient.updateDnsRecord(zoneResult.data, recordId, {
      type: record.type,
      name: record.name,
      content: record.value,
      ttl: record.ttl,
      priority: record.priority ?? undefined,
    })

    if (!response.success) {
      return {
        success: false,
        error: response.error || '更新 DNS 记录失败',
        code: response.code,
      }
    }

    const data = response.data as any
    return {
      success: true,
      data: {
        id: data?.id || recordId,
        type: data?.type || record.type || '',
        name: data?.name || record.name || '',
        value: data?.content || record.value || '',
        ttl: data?.ttl || record.ttl || 1,
        priority: data?.priority || record.priority || null,
        createdAt: data?.created_on || new Date().toISOString(),
        updatedAt: data?.modified_on || new Date().toISOString(),
      },
    }
  }

  async deleteDNSRecord(domain: string, recordId: string): Promise<DNSOperationResult> {
    const zoneResult = await this.findZoneId(domain)
    if (!zoneResult.success || !zoneResult.data) {
      return { success: false, error: zoneResult.error, code: zoneResult.code }
    }

    const response = await this.apiClient.deleteDnsRecord(zoneResult.data, recordId)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '删除 DNS 记录失败',
        code: response.code,
      }
    }

    return { success: true }
  }
}

DNSProviderFactory.registerProvider('cloudflare', CloudflareDNSProvider)
