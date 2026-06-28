/**
 * Namecheap DNS Provider 实现
 *
 * Namecheap 使用"整体设置主机记录"（setHosts）的模式，没有单独的增删改接口。
 * 本 provider 在内存中维护记录列表，然后全量提交。
 */

import type {
  DNSOperationResult,
  DNSRecordInput,
  DNSRecordOutput,
} from '../base'
import { DNSProvider, DNSProviderFactory } from '../base'
import { NamecheapApiClient } from './apiClient'

interface NamecheapConfig {
  apiUser: string
  apiKey: string
  clientIp: string
  apiUrl?: string
}

export class NamecheapDNSProvider extends DNSProvider {
  readonly id = 'namecheap'
  readonly name = 'Namecheap'

  private apiClient: NamecheapApiClient

  constructor(config: NamecheapConfig) {
    super(config)
    this.apiClient = new NamecheapApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient
  }

  async getDNSRecords(domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    const response = await this.apiClient.getHosts(domain)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '获取 DNS 记录失败',
        code: response.code,
      }
    }

    const records: DNSRecordOutput[] = (response.data || []).map(
      (record: any) => ({
        id: String(record.HostId || `${record.Name}-${record.Type}-${record.Address}`),
        type: record.Type,
        name: record.Name,
        value: record.Address,
        ttl: Number(record.TTL) || 1800,
        priority: record.MXPref !== undefined ? Number(record.MXPref) : null,
        createdAt: '',
        updatedAt: '',
      }),
    )

    return { success: true, data: records }
  }

  /**
   * 读取当前主机记录 → 操作本地列表 → 全量提交
   */
  private async modifyHosts(
    domain: string,
    transform: (existing: { Name: string, Type: string, Address: string, TTL: number, MXPref?: number, HostId?: string | number }[]) => { Name: string, Type: string, Address: string, TTL: number, MXPref?: number }[],
  ): Promise<DNSOperationResult<DNSRecordOutput>> {
    const listResponse = await this.apiClient.getHosts(domain)
    if (!listResponse.success) {
      return {
        success: false,
        error: listResponse.error || '获取 DNS 记录失败',
        code: listResponse.code,
      }
    }

    const existing = (listResponse.data || []).map((r: any) => ({
      Name: r.Name,
      Type: r.Type,
      Address: r.Address,
      TTL: Number(r.TTL) || 1800,
      MXPref: r.MXPref !== undefined ? Number(r.MXPref) : undefined,
      HostId: r.HostId,
    }))

    const updated = transform(existing)
    const submitResponse = await this.apiClient.setHosts(domain, updated)
    if (!submitResponse.success) {
      return {
        success: false,
        error: submitResponse.error || '更新 DNS 记录失败',
        code: submitResponse.code,
      }
    }

    return {
      success: true,
      data: {
        id: '',
        type: '',
        name: '',
        value: '',
        ttl: 1800,
        priority: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
  }

  async addDNSRecord(domain: string, record: DNSRecordInput): Promise<DNSOperationResult<DNSRecordOutput>> {
    return this.modifyHosts(domain, existing => [
      ...existing.map(e => ({ Name: e.Name, Type: e.Type, Address: e.Address, TTL: e.TTL, MXPref: e.MXPref })),
      {
        Name: record.name,
        Type: record.type,
        Address: record.value,
        TTL: record.ttl || 1800,
        MXPref: record.priority ?? undefined,
      },
    ])
  }

  async updateDNSRecord(
    domain: string,
    recordId: string,
    record: Partial<DNSRecordInput>,
  ): Promise<DNSOperationResult<DNSRecordOutput>> {
    return this.modifyHosts(domain, existing => existing.map((e) => {
      if (String(e.HostId || '') !== recordId && `${e.Name}-${e.Type}-${e.Address}` !== recordId) {
        return { Name: e.Name, Type: e.Type, Address: e.Address, TTL: e.TTL, MXPref: e.MXPref }
      }
      return {
        Name: record.name !== undefined ? record.name : e.Name,
        Type: record.type !== undefined ? record.type : e.Type,
        Address: record.value !== undefined ? record.value : e.Address,
        TTL: record.ttl !== undefined ? record.ttl : e.TTL,
        MXPref: record.priority ?? e.MXPref,
      }
    }))
  }

  async deleteDNSRecord(domain: string, recordId: string): Promise<DNSOperationResult> {
    return this.modifyHosts(domain, existing =>
      existing
        .filter(e => String(e.HostId || '') !== recordId && `${e.Name}-${e.Type}-${e.Address}` !== recordId)
        .map(e => ({ Name: e.Name, Type: e.Type, Address: e.Address, TTL: e.TTL, MXPref: e.MXPref })))
  }
}

DNSProviderFactory.registerProvider('namecheap', NamecheapDNSProvider)
