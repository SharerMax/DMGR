import type { DNSOperationResult, DNSRecordInput, DNSRecordOutput } from '../base'
import { DNSProvider, DNSProviderFactory } from '../base'
import { VPS8ApiClient } from './apiClient'

interface VPS8ProviderConfig {
  apiKey: string
  apiUrl?: string
}

interface VPS8DNSRecord {
  id: number
  host: string
  type: string
  value: string
  ttl: number
  priority: number
  provider_record_id: string
}

export class VPS8DNSProvider extends DNSProvider {
  readonly id = 'vps8'
  readonly name = 'VPS8'

  protected declare apiClient?: VPS8ApiClient

  constructor(config: VPS8ProviderConfig) {
    const apiClient = new VPS8ApiClient(config)
    super({
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      apiClient,
    })
  }

  validateConfig(): boolean {
    return !!this.apiKey
  }

  async getDNSRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    const response = await this.apiClient!.request<VPS8DNSRecord[]>(
      '/record_list',
      { domain },
    )

    if (!response.success) {
      return {
        success: false,
        error: response.error,
      }
    }

    const records = (response.data || []).map(record => ({
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
      data: records,
    }
  }

  async addDNSRecord(domain: string, record: DNSRecordInput): Promise<DNSOperationResult<DNSRecordOutput>> {
    const response = await this.apiClient!.request<VPS8DNSRecord>('/record_create', {
      domain,
      host: record.name,
      type: record.type,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority,
    })

    if (!response.success) {
      return {
        success: false,
        error: response.error,
      }
    }

    return {
      success: true,
      data: {
        id: response.data?.id?.toString() || '',
        type: response.data?.type || '',
        value: response.data?.value || '',
        ttl: response.data?.ttl || 0,
        priority: response.data?.priority || 0,
        name: response.data?.host || '',
        createdAt: '',
        updatedAt: '',
      },
    }
  }

  async deleteDNSRecord(domain: string, recordId: string): Promise<DNSOperationResult> {
    const response = await this.apiClient!.request('/record_delete', {
      domain,
      record_id: recordId,
    })

    if (!response.success) {
      return {
        success: false,
        error: response.error,
      }
    }

    return {
      success: true,
      data: {},
    }
  }

  async updateDNSRecord(
    domain: string,
    recordId: string,
    record: Partial<DNSRecordInput>,
  ): Promise<DNSOperationResult<DNSRecordOutput>> {
    const response = await this.apiClient!.request<VPS8DNSRecord>('/record_update', {
      domain,
      id: recordId,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority,
    })

    if (!response.success) {
      return {
        success: false,
        error: response.error,
      }
    }

    return {
      success: true,
      data: {
        id: response.data?.id?.toString() || '',
        type: response.data?.type || '',
        value: response.data?.value || '',
        ttl: response.data?.ttl || 0,
        priority: response.data?.priority || 0,
        name: response.data?.host || '',
        createdAt: '',
        updatedAt: '',
      },
    }
  }
}

DNSProviderFactory.registerProvider('vps8', VPS8DNSProvider)
