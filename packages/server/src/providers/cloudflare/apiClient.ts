/**
 * Cloudflare API 客户端
 *
 * 使用官方 SDK `cloudflare`（官方 TypeScript Library）。
 *   - Zone 管理：`client.zones.list/get/edit/create/delete`
 *   - DNS 记录：`client.dns.records.list/create/edit/update/delete`
 *
 * SDK 内部处理 Bearer Token 签名、URL 构造与错误解析。
 */

import Cloudflare from 'cloudflare'

interface CloudflareConfig {
  apiToken: string
  email?: string
}

export interface CloudflareApiResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  raw?: unknown
}

function extractError(error: any): { message: string, code?: string, raw: unknown } {
  if (!error) {
    return { message: 'Cloudflare API 请求失败', raw: error }
  }
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    const first = error.errors[0]
    return {
      message: first.message || 'Cloudflare API 错误',
      code: first.code !== undefined ? String(first.code) : undefined,
      raw: error,
    }
  }
  if (error instanceof Error) {
    return { message: error.message, raw: error }
  }
  if (typeof error === 'object') {
    return {
      message: error.message || error.Message || 'Cloudflare API 错误',
      code: error.code !== undefined ? String(error.code) : undefined,
      raw: error,
    }
  }
  return { message: String(error), raw: error }
}

function wrapSdkCall<T = unknown>(fn: () => Promise<any>): Promise<CloudflareApiResult<T>> {
  return fn()
    .then((resp) => {
      if (resp && resp.success === false) {
        const { message, code, raw } = extractError(resp)
        return { success: false, error: message, code, raw }
      }
      // 某些 SDK 接口直接返回数据；另一些返回 { result, result_info, success, errors, messages }
      if (resp && resp.result !== undefined) {
        return { success: true, data: resp.result as T, raw: resp }
      }
      return { success: true, data: resp as T, raw: resp }
    })
    .catch((error) => {
      const { message, code, raw } = extractError(error)
      return { success: false, error: message, code, raw }
    })
}

export class CloudflareApiClient {
  private client: any

  constructor(config: CloudflareConfig) {
    this.client = new Cloudflare({ apiToken: config.apiToken })
  }

  // --- Zone / 域名 ---

  async listZones(perPage = 100): Promise<CloudflareApiResult<any[]>> {
    return wrapSdkCall(() => this.client.zones.list({ per_page: perPage }))
  }

  async getZone(zoneId: string): Promise<CloudflareApiResult<any>> {
    return wrapSdkCall(() => this.client.zones.get({ zone_id: zoneId }))
  }

  // --- DNS 记录 ---

  async listDnsRecords(zoneId: string, perPage = 500): Promise<CloudflareApiResult<any[]>> {
    return wrapSdkCall(() => this.client.dns.records.list({ zone_id: zoneId, per_page: perPage }))
  }

  async createDnsRecord(
    zoneId: string,
    record: { type: string, name: string, content: string, ttl?: number, priority?: number, proxied?: boolean, comment?: string, tags?: string[] },
  ): Promise<CloudflareApiResult<any>> {
    return wrapSdkCall(() => this.client.dns.records.create({
      zone_id: zoneId,
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl ?? 1,
      ...(record.priority !== undefined && record.priority !== null ? { priority: record.priority } : {}),
      ...(record.proxied !== undefined ? { proxied: record.proxied } : {}),
      ...(record.comment !== undefined ? { comment: record.comment } : {}),
      ...(record.tags !== undefined ? { tags: record.tags } : {}),
    }))
  }

  async updateDnsRecord(
    zoneId: string,
    recordId: string,
    record: { type?: string, name?: string, content?: string, ttl?: number, priority?: number, proxied?: boolean, comment?: string, tags?: string[] },
  ): Promise<CloudflareApiResult<any>> {
    const params: Record<string, unknown> = { zone_id: zoneId, dns_record_id: recordId }
    if (record.type !== undefined) {
      params.type = record.type
    }
    if (record.name !== undefined) {
      params.name = record.name
    }
    if (record.content !== undefined) {
      params.content = record.content
    }
    if (record.ttl !== undefined) {
      params.ttl = record.ttl
    }
    if (record.priority !== undefined && record.priority !== null) {
      params.priority = record.priority
    }
    if (record.proxied !== undefined) {
      params.proxied = record.proxied
    }
    if (record.comment !== undefined) {
      params.comment = record.comment
    }
    if (record.tags !== undefined) {
      params.tags = record.tags
    }
    return wrapSdkCall(() => this.client.dns.records.update(params))
  }

  async deleteDnsRecord(zoneId: string, recordId: string): Promise<CloudflareApiResult<any>> {
    return wrapSdkCall(() => this.client.dns.records.delete({ zone_id: zoneId, dns_record_id: recordId }))
  }
}
