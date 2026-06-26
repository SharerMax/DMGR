import type { DNSOperationResult, DNSRecordInput, DNSRecordOutput } from '../base'
import { Buffer } from 'node:buffer'
import { DNSProvider, DNSProviderFactory } from '../base'

interface VPS8ProviderConfig {
  apiKey: string
}

/**
 * VPS8 API 响应
 * @template T - 响应数据类型
 *
 * @example 响应示例
 * {
  "result": [
    {
      "id": 12105,
      "host": "@",
      "type": "CNAME",
      "value": "fb6992c6f5decd38.gw.i8.al",
      "ttl": 3600,
      "priority": 0,
      "provider_record_id": "6a081632853c4"
    }
  ],
  "error": null
}
 */
interface VPS8APIResponse<T = any> {
  result?: T
  error?: string
}
/***
 * VPS8 DNS 记录
 * {
      "id": 12105,
      "host": "@",
      "type": "CNAME",
      "value": "fb6992c6f5decd38.gw.i8.al",
      "ttl": 3600,
      "priority": 0,
      "provider_record_id": "6a081632853c4"
    }

 */
interface VPS8DNSRecord {
  id: number
  host: string
  type: string
  value: string
  ttl: number
  priority: number
  provider_record_id: string
}

// VPS8 API 地址（预留）
const VPS8_API_URL = 'https://vps8.zz.cd/api/client/dnsopenapi'

export class VPS8DNSProvider extends DNSProvider {
  readonly id = 'vps8'
  readonly name = 'VPS8'

  constructor(vps8ProviderConfig: VPS8ProviderConfig) {
    super(vps8ProviderConfig)
  }

  private async request<T = any>(
    apiPath: string,
    requestParams: Record<string, any> = {},
  ): Promise<VPS8APIResponse<T>> {
    const response = await fetch(`${VPS8_API_URL}/${apiPath}`, {
      method: 'POST',
      headers: {
        // VPS8 API 要求请求体为 JSON 格式
        'Content-Type': 'application/json',
        // VPS8 API 要求 Basic Auth 认证 默认用户名为 client
        'Authorization': `Basic ${Buffer.from(`client:${this.apiKey}`).toString('base64')}`,
      },
      body: JSON.stringify(requestParams),
    })
    const data = await response.json()
    return data as VPS8APIResponse<T>
  }

  validateConfig(): boolean {
    return this.apiKey !== undefined
  }

  async getDNSRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    const response = await this.request<VPS8DNSRecord[]>(`/record_list`, { domain })
    if (response.error) {
      throw new Error(response.error)
    }
    const records = response.result || []
    const dnsRecords: DNSRecordOutput[] = records.map(record => ({
      id: record.id.toString(),
      type: record.type,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority,
      name: record.host,

      createdAt: '',
      updatedAt: '',
    }))
    return {
      success: true,
      data: dnsRecords,
    }
  }

  async addDNSRecord(domain: string, record: DNSRecordInput): Promise<DNSOperationResult<DNSRecordOutput>> {
    const response = await this.request<VPS8DNSRecord>(`/record_create`, {
      domain,
      host: record.name,
      type: record.type,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority,
    })
    if (response.error) {
      throw new Error(response.error)
    }
    return {
      success: true,
      data: {
        id: response.result?.id?.toString() || '',
        type: response.result?.type || '',
        value: response.result?.value || '',
        ttl: response.result?.ttl || 0,
        priority: response.result?.priority || 0,
        name: response.result?.host || '',

        createdAt: '',
        updatedAt: '',
      },
    }
  }

  async deleteDNSRecord(domain: string, recordId: string): Promise<DNSOperationResult> {
    const response = await this.request<VPS8DNSRecord>(`/record_delete`, {
      domain,
      record_id: recordId,
    })
    if (response.error) {
      throw new Error(response.error)
    }
    return {
      success: true,
      data: {},
    }
  }

  async updateDNSRecord(domain: string, recordId: string, record: Partial<DNSRecordInput>): Promise<DNSOperationResult<DNSRecordOutput>> {
    const response = await this.request<VPS8DNSRecord>(`/record_update`, {
      domain,
      id: recordId,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority,
    })
    if (response.error) {
      throw new Error(response.error)
    }
    return {
      success: true,
      data: {
        id: response.result?.id?.toString() || '',
        type: response.result?.type || '',
        value: response.result?.value || '',
        ttl: response.result?.ttl || 0,
        priority: response.result?.priority || 0,
        name: response.result?.host || '',
        createdAt: '',
        updatedAt: '',
      },
    }
  }
}
DNSProviderFactory.registerProvider('vps8', VPS8DNSProvider)
