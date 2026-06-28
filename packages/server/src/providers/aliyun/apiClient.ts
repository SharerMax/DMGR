/**
 * 阿里云 API 客户端
 *
 * 使用官方 SDK `@alicloud/pop-core` 处理签名与请求，避免手写签名。
 * DNS API 版本: 2015-01-09
 *
 * 业务化方法由 provider / syncer / renewer 导入使用。
 */

import Core from '@alicloud/pop-core'

interface AliyunConfig {
  accessKeyId: string
  accessKeySecret: string
  region?: string
}

export interface AliyunApiResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  raw?: unknown
}

const ALIYUN_DNS_ENDPOINT = 'https://alidns.aliyuncs.com'
const ALIYUN_DNS_API_VERSION = '2015-01-09'

/**
 * 将原始响应中可能的字段（如 `Code`/`Message`）抽取为错误信息。
 */
function extractErrorMessage(raw: any): string | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }
  return raw.Message || raw.message || raw.Code || raw.code || undefined
}

function extractErrorCode(raw: any): string | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }
  return raw.Code || raw.code || undefined
}

export class AliyunApiClient {
  private client: Core

  constructor(config: AliyunConfig) {
    this.client = new Core({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: ALIYUN_DNS_ENDPOINT,
      apiVersion: ALIYUN_DNS_API_VERSION,
    })
  }

  /**
   * 统一请求入口：调用阿里云 POP (OpenAPI) RPC 接口。
   * 由 SDK 内部处理签名、时间戳、随机数。
   */
  private async request<T = unknown>(
    action: string,
    params: Record<string, unknown> = {},
  ): Promise<AliyunApiResult<T>> {
    try {
      const raw = await this.client.request(action, params, {
        method: 'POST',
      }) as any

      if (raw && (raw.Code || raw.code)) {
        return {
          success: false,
          error: extractErrorMessage(raw) || `阿里云 API 错误`,
          code: extractErrorCode(raw),
          raw,
        }
      }

      return {
        success: true,
        data: raw as T,
        raw,
      }
    }
    catch (error: any) {
      const raw = (error?.data || error?.response?.body || error) as any
      return {
        success: false,
        error: extractErrorMessage(raw) || error?.message || '阿里云 API 请求失败',
        code: extractErrorCode(raw) || error?.code || undefined,
        raw,
      }
    }
  }

  // --- DNS 记录相关 ---

  /**
   * 获取域名解析记录列表
   * @see https://help.aliyun.com/document_detail/29776.html
   */
  async describeDomainRecords(
    domain: string,
    pageSize = 500,
  ): Promise<AliyunApiResult<{ DomainRecords?: { Record?: any[] } }>> {
    return this.request('DescribeDomainRecords', { DomainName: domain, PageSize: pageSize })
  }

  /**
   * 新增解析记录
   * @see https://help.aliyun.com/document_detail/29772.html
   */
  async addDomainRecord(
    domain: string,
    record: { RR: string, Type: string, Value: string, TTL?: number, Priority?: number, Line?: string },
  ): Promise<AliyunApiResult<{ RecordId: string }>> {
    return this.request('AddDomainRecord', {
      DomainName: domain,
      RR: record.RR,
      Type: record.Type,
      Value: record.Value,
      TTL: record.TTL ?? 600,
      ...(record.Priority !== undefined && record.Priority !== null ? { Priority: record.Priority } : {}),
      ...(record.Line !== undefined ? { Line: record.Line } : {}),
    })
  }

  /**
   * 更新解析记录
   * @see https://help.aliyun.com/document_detail/29774.html
   */
  async updateDomainRecord(
    recordId: string,
    record: { RR?: string, Type?: string, Value?: string, TTL?: number, Priority?: number, Line?: string },
  ): Promise<AliyunApiResult<{ RecordId: string }>> {
    const params: Record<string, unknown> = { RecordId: recordId }
    if (record.RR !== undefined) {
      params.RR = record.RR
    }
    if (record.Type !== undefined) {
      params.Type = record.Type
    }
    if (record.Value !== undefined) {
      params.Value = record.Value
    }
    if (record.TTL !== undefined) {
      params.TTL = record.TTL
    }
    if (record.Priority !== undefined && record.Priority !== null) {
      params.Priority = record.Priority
    }
    if (record.Line !== undefined) {
      params.Line = record.Line
    }
    return this.request('UpdateDomainRecord', params)
  }

  /**
   * 删除解析记录
   * @see https://help.aliyun.com/document_detail/29773.html
   */
  async deleteDomainRecord(recordId: string): Promise<AliyunApiResult<Record<string, unknown>>> {
    return this.request('DeleteDomainRecord', { RecordId: recordId })
  }

  // --- 域名相关 ---

  /**
   * 获取域名列表
   */
  async describeDomains(
    pageSize = 500,
  ): Promise<AliyunApiResult<{ Domains?: { Domain?: any[] } }>> {
    return this.request('DescribeDomains', { PageSize: pageSize })
  }

  /**
   * 获取域名信息
   */
  async describeDomainInfo(domain: string): Promise<AliyunApiResult<any>> {
    return this.request('DescribeDomainInfo', { DomainName: domain })
  }
}
