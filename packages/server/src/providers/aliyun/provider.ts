/**
 * 阿里云 DNS Provider 实现
 */

import type {
  DNSOperationResult,
  DNSRecordInput,
  DNSRecordOutput,
} from '../base'
import {
  DNSProvider,
  DNSProviderFactory,
} from '../base'
import { AliyunApiClient } from './apiClient'

interface AliyunRecord {
  RecordId: string
  RR: string
  Type: string
  Value: string
  TTL: number
  Priority?: number
  Line?: string
  Status: string
  Locked: boolean
  Weight?: number
  Remark?: string
  createTime: string
  updateTime: string
}

interface AliyunConfig {
  apiKey: string
  apiSecret: string
  region?: string
  apiUrl?: string
}

/**
 * 阿里云 DNS Provider 实现
 */
export class AliyunDNSProvider extends DNSProvider {
  readonly id = 'aliyun'
  readonly name = '阿里云'

  private config: AliyunConfig
  protected declare apiClient?: AliyunApiClient

  constructor(config: AliyunConfig) {
    const apiClient = new AliyunApiClient(config)
    super({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      apiClient,
    })
    this.config = {
      region: 'cn-hangzhou',
      ...config,
    }
  }

  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.apiSecret)
  }

  async getDNSRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    const response = await this.apiClient!.request<{ RecordIds?: { RecordId: AliyunRecord[] } }>(
      'DescribeDomainRecords',
      { DomainName: domain, PageSize: 500 },
    )

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取 DNS 记录失败',
        code: response.code,
      }
    }

    const records: DNSRecordOutput[] = (response.data?.RecordIds?.RecordId || []).map(
      (record: AliyunRecord) => ({
        id: record.RecordId,
        type: record.Type,
        name: record.RR,
        value: record.Value,
        ttl: record.TTL,
        priority: record.Priority || null,
        line: record.Line,
        createdAt: record.createTime,
        updatedAt: record.updateTime,
      }),
    )

    return {
      success: true,
      data: records,
    }
  }

  async addDNSRecord(domain: string, record: DNSRecordInput): Promise<DNSOperationResult<DNSRecordOutput>> {
    const params: Record<string, any> = {
      DomainName: domain,
      RR: record.name,
      Type: record.type,
      Value: record.value,
      TTL: record.ttl || 600,
    }

    if (record.priority) {
      params.Priority = record.priority
    }
    if (record.line) {
      params.Line = record.line
    }

    const response = await this.apiClient!.request<{ RecordId: string }>('AddDomainRecord', params)

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
        id: response.data?.RecordId || '',
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
    _domain: string,
    recordId: string,
    record: Partial<DNSRecordInput>,
  ): Promise<DNSOperationResult<DNSRecordOutput>> {
    const params: Record<string, any> = {
      RecordId: recordId,
    }

    if (record.name !== undefined)
      params.RR = record.name
    if (record.type !== undefined)
      params.Type = record.type
    if (record.value !== undefined)
      params.Value = record.value
    if (record.ttl !== undefined)
      params.TTL = record.ttl
    if (record.priority !== undefined)
      params.Priority = record.priority
    if (record.line !== undefined)
      params.Line = record.line

    const response = await this.apiClient!.request<{ RecordId: string }>('UpdateDomainRecord', params)

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

  async deleteDNSRecord(_domain: string, recordId: string): Promise<DNSOperationResult> {
    const response = await this.apiClient!.request('DeleteDomainRecord', { RecordId: recordId })

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

// 注册到工厂
DNSProviderFactory.registerProvider('aliyun', AliyunDNSProvider)
