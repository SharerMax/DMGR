/**
 * 腾讯云 DNS / Domain API 客户端
 *
 * 使用腾讯云官方 Node.js SDK：
 *   - `tencentcloud-sdk-nodejs-dnspod`（DNS 记录与域名管理，API 版本 2021-03-23）
 *   - `tencentcloud-sdk-nodejs-domain`（域名注册与续期，API 版本 2018-08-08）
 *
 * 由 SDK 内部处理 TC3-HMAC-SHA256 签名、时间戳、随机数等。
 */

import * as dnspod from 'tencentcloud-sdk-nodejs-dnspod'
import * as domain from 'tencentcloud-sdk-nodejs-domain'

interface TencentConfig {
  secretId: string
  secretKey: string
  region?: string
}

export interface TencentApiResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  raw?: unknown
}

const DEFAULT_REGION = ''
const DNS_PRODUCT_VERSION = 'v20210323'
const DOMAIN_PRODUCT_VERSION = 'v20180808'

function wrapSdkCall<T = unknown>(fn: () => Promise<any>): Promise<TencentApiResult<T>> {
  return fn()
    .then((resp: any) => ({
      success: true,
      data: resp as T,
      raw: resp,
    }))
    .catch((error: any) => {
      const code = error?.code || error?.ErrorCode || undefined
      const message = error?.message || error?.ErrorMessage || error?.message || '腾讯云 API 请求失败'
      return {
        success: false,
        error: message,
        code,
        raw: error,
      }
    })
}

export class TencentApiClient {
  private dnsClient: any
  private domainClient: any

  constructor(config: TencentConfig) {
    const credential = {
      secretId: config.secretId,
      secretKey: config.secretKey,
    }
    const region = config.region ?? DEFAULT_REGION

    const DnsClient = (dnspod as any).dnspod?.[DNS_PRODUCT_VERSION]?.Client
    const DomainClient = (domain as any).domain?.[DOMAIN_PRODUCT_VERSION]?.Client

    this.dnsClient = new DnsClient({
      credential,
      region,
      profile: {
        httpProfile: {
          endpoint: 'dnspod.tencentcloudapi.com',
        },
      },
    })

    this.domainClient = new DomainClient({
      credential,
      region,
      profile: {
        httpProfile: {
          endpoint: 'domain.tencentcloudapi.com',
        },
      },
    })
  }

  // --- DNS 记录相关 ---

  /**
   * 获取解析记录列表
   * @see https://cloud.tencent.com/document/api/1427/56166
   */
  async describeRecordList(
    domain: string,
    limit = 500,
  ): Promise<TencentApiResult<{ RecordList?: any[] }>> {
    return wrapSdkCall(() => this.dnsClient.DescribeRecordList({ Domain: domain, Limit: limit }))
  }

  /**
   * 新增解析记录
   */
  async createRecord(
    domain: string,
    record: { subDomain: string, recordType: string, recordLine: string, value: string, ttl?: number, priority?: number },
  ): Promise<TencentApiResult<{ RecordId: number }>> {
    return wrapSdkCall(() => this.dnsClient.CreateRecord({
      Domain: domain,
      SubDomain: record.subDomain,
      RecordType: record.recordType,
      RecordLine: record.recordLine || '默认',
      Value: record.value,
      TTL: record.ttl ?? 600,
      ...(record.priority !== undefined && record.priority !== null ? { MX: record.priority } : {}),
    }))
  }

  /**
   * 更新解析记录
   */
  async updateRecord(
    domain: string,
    recordId: number,
    record: { subDomain?: string, recordType?: string, recordLine?: string, value?: string, ttl?: number, priority?: number },
  ): Promise<TencentApiResult<Record<string, unknown>>> {
    const params: Record<string, unknown> = { Domain: domain, RecordId: recordId }
    if (record.subDomain !== undefined) {
      params.SubDomain = record.subDomain
    }
    if (record.recordType !== undefined) {
      params.RecordType = record.recordType
    }
    if (record.recordLine !== undefined) {
      params.RecordLine = record.recordLine
    }
    if (record.value !== undefined) {
      params.Value = record.value
    }
    if (record.ttl !== undefined) {
      params.TTL = record.ttl
    }
    if (record.priority !== undefined && record.priority !== null) {
      params.MX = record.priority
    }
    return wrapSdkCall(() => this.dnsClient.ModifyRecord(params))
  }

  /**
   * 删除解析记录
   */
  async deleteRecord(
    domain: string,
    recordId: number,
  ): Promise<TencentApiResult<Record<string, unknown>>> {
    return wrapSdkCall(() => this.dnsClient.DeleteRecord({ Domain: domain, RecordId: recordId }))
  }

  // --- 域名相关 ---

  /**
   * 获取域名列表
   */
  async describeDomainList(
    limit = 500,
  ): Promise<TencentApiResult<{ DomainList?: any[] }>> {
    return wrapSdkCall(() => this.dnsClient.DescribeDomainList({ Limit: limit }))
  }

  /**
   * 获取域名详情
   */
  async describeDomain(domain: string): Promise<TencentApiResult<any>> {
    return wrapSdkCall(() => this.dnsClient.DescribeDomain({ Domain: domain }))
  }

  // --- 域名续期相关（domain 产品） ---

  /**
   * 查询域名续期状态 / 价格
   */
  async checkDomainRenewal(
    domain: string,
  ): Promise<TencentApiResult<{ Eligible?: boolean, MaxRenewYears?: number }>> {
    return wrapSdkCall(() => this.domainClient.CheckDomain({ DomainName: domain }))
  }

  /**
   * 续期域名
   */
  async renewDomain(
    domain: string,
    years: number,
  ): Promise<TencentApiResult<{ DealId?: string, OrderId?: string }>> {
    return wrapSdkCall(() => this.domainClient.RenewDomain({ DomainName: domain, Period: years }))
  }
}
