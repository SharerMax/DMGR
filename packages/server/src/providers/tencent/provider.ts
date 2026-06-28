/**
 * 腾讯云 DNS Provider 实现
 */

import type {
  DNSOperationResult,
  DNSRecordInput,
  DNSRecordOutput,
} from '../base'
import { DNSProvider, DNSProviderFactory } from '../base'
import { TencentApiClient } from './apiClient'

interface TencentConfig {
  secretId: string
  secretKey: string
  region?: string
  apiUrl?: string
}

export class TencentDNSProvider extends DNSProvider {
  readonly id = 'tencent'
  readonly name = '腾讯云'

  private apiClient: TencentApiClient

  constructor(config: TencentConfig) {
    super(config)
    this.apiClient = new TencentApiClient(config)
  }

  validateConfig(): boolean {
    return !!(this.apiClient)
  }

  async getDNSRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    const response = await this.apiClient.describeRecordList(domain)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取 DNS 记录失败',
        code: response.code,
      }
    }

    const records: DNSRecordOutput[] = (response.data?.RecordList || []).map(
      (record: any) => ({
        id: String(record.RecordId),
        type: record.Type,
        name: record.Name,
        value: record.Value,
        ttl: record.TTL,
        priority: record.Priority || null,
        line: record.Line,
        createdAt: '',
        updatedAt: record.UpdatedOn || '',
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
      priority: record.priority ?? undefined,
    })

    if (!response.success) {
      return {
        success: false,
        error: response.error || '添加 DNS 记录失败',
        code: response.code,
      }
    }

    return {
      success: true,
      data: {
        id: String(response.data?.RecordId || ''),
        type: record.type,
        name: record.name,
        value: record.value,
        ttl: record.ttl || 600,
        priority: record.priority || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
  }

  async updateDNSRecord(
    domain: string,
    recordId: string,
    record: Partial<DNSRecordInput>,
  ): Promise<DNSOperationResult<DNSRecordOutput>> {
    const response = await this.apiClient.updateRecord(domain, Number(recordId), {
      subDomain: record.name,
      recordType: record.type,
      recordLine: record.line,
      value: record.value,
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

    return {
      success: true,
      data: {
        id: recordId,
        type: record.type || '',
        name: record.name || '',
        value: record.value || '',
        ttl: record.ttl || 600,
        priority: record.priority || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
  }

  async deleteDNSRecord(domain: string, recordId: string): Promise<DNSOperationResult> {
    const response = await this.apiClient.deleteRecord(domain, Number(recordId))

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

DNSProviderFactory.registerProvider('tencent', TencentDNSProvider)
