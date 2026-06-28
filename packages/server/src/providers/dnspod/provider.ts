/**
 * DNSPod DNS Provider 实现
 */

import type {
  DNSOperationResult,
  DNSRecordInput,
  DNSRecordOutput,
} from '../base'
import { DNSProvider, DNSProviderFactory } from '../base'
import { DnspodApiClient } from './apiClient'

interface DnspodConfig {
  loginToken: string
  apiUrl?: string
}

export class DnspodDNSProvider extends DNSProvider {
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

  async getDNSRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
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

  async addDNSRecord(domain: string, record: DNSRecordInput): Promise<DNSOperationResult<DNSRecordOutput>> {
    const response = await this.apiClient.createRecord(domain, {
      subDomain: record.name,
      recordType: record.type,
      recordLine: record.line || '默认',
      value: record.value,
      ttl: record.ttl,
      mx: record.priority ?? undefined,
    })

    if (!response.success) {
      return {
        success: false,
        error: response.error || '添加 DNS 记录失败',
        code: response.code,
      }
    }

    const raw: any = response.data
    const created = raw?.record || {}
    return {
      success: true,
      data: {
        id: String(created.id || ''),
        type: created.type || created.record_type || record.type,
        name: created.name || created.sub_domain || record.name,
        value: created.value || record.value,
        ttl: Number(created.ttl) || record.ttl || 600,
        priority: created.mx ? Number(created.mx) : record.priority || null,
        createdAt: created.created_on || new Date().toISOString(),
        updatedAt: created.updated_on || new Date().toISOString(),
      },
    }
  }

  async updateDNSRecord(
    domain: string,
    recordId: string,
    record: Partial<DNSRecordInput>,
  ): Promise<DNSOperationResult<DNSRecordOutput>> {
    const response = await this.apiClient.updateRecord(domain, recordId, {
      subDomain: record.name,
      recordType: record.type,
      recordLine: record.line,
      value: record.value,
      ttl: record.ttl,
      mx: record.priority ?? undefined,
    })

    if (!response.success) {
      return {
        success: false,
        error: response.error || '更新 DNS 记录失败',
        code: response.code,
      }
    }

    const raw: any = response.data
    const updated = raw?.record || {}
    return {
      success: true,
      data: {
        id: String(updated.id || recordId),
        type: updated.type || updated.record_type || record.type || '',
        name: updated.name || updated.sub_domain || record.name || '',
        value: updated.value || record.value || '',
        ttl: Number(updated.ttl) || record.ttl || 600,
        priority: updated.mx ? Number(updated.mx) : record.priority || null,
        createdAt: updated.created_on || new Date().toISOString(),
        updatedAt: updated.updated_on || new Date().toISOString(),
      },
    }
  }

  async deleteDNSRecord(domain: string, recordId: string): Promise<DNSOperationResult> {
    const response = await this.apiClient.deleteRecord(domain, recordId)

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

DNSProviderFactory.registerProvider('dnspod', DnspodDNSProvider)
