/**
 * Namecheap XML API 客户端
 *
 * Namecheap 使用传统 XML API（`api.namecheap.com/xml.response`）。
 * 认证方式：`ApiUser` + `ApiKey` + `UserName` + `ClientIp`。
 * 签名算法：`HMAC-SHA1`，签名输入格式：`ApiUser|ApiKey|Timestamp`。
 *
 * 核心 API：
 *   - domains.getList          : 获取域名列表
 *   - domains.getInfo          : 获取域名详情
 *   - domains.dns.getHosts     : 获取 DNS 记录（setHosts 的前置操作）
 *   - domains.dns.setHosts     : 全量覆盖写入 DNS 记录
 *   - domains.renew            : 续费域名
 */

import crypto from 'node:crypto'
import { XMLParser } from 'fast-xml-parser'

interface NamecheapConfig {
  apiUser: string
  apiKey: string
  clientIp: string
  apiUrl?: string
}

export interface NamecheapApiResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  raw?: unknown
}

const NAMECHEAP_DEFAULT_API_URL = 'https://api.namecheap.com/xml.response'
const SLD_TLD_REGEX = /^([^.]+)\.(.+)$/

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  cdataPropName: '__cdata',
  parseTagValue: true,
  trimValues: true,
})

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function toTimestamp(date: Date): string {
  const y = date.getUTCFullYear()
  const m = pad(date.getUTCMonth() + 1)
  const d = pad(date.getUTCDate())
  const hh = pad(date.getUTCHours())
  const mm = pad(date.getUTCMinutes())
  const ss = pad(date.getUTCSeconds())
  return `${m}/${d}/${y} ${hh}:${mm}:${ss}`
}

function hmacSha1(key: string, data: string): string {
  return crypto.createHmac('sha1', key).update(data).digest('hex')
}

function normalizeHostList(hosts: any): any[] {
  if (!hosts) {
    return []
  }
  // hosts 可能是单个对象或数组
  const list = Array.isArray(hosts) ? hosts : [hosts]
  return list.map(h => ({
    HostId: h['@_HostId'] !== undefined ? String(h['@_HostId']) : undefined,
    Name: h['@_Name'] !== undefined ? String(h['@_Name']) : '',
    Type: h['@_Type'] !== undefined ? String(h['@_Type']) : '',
    Address: h['@_Address'] !== undefined ? String(h['@_Address']) : '',
    TTL: h['@_TTL'] !== undefined ? Number(h['@_TTL']) : undefined,
    MXPref: h['@_MXPref'] !== undefined ? Number(h['@_MXPref']) : undefined,
  }))
}

function normalizeDomainList(domains: any): any[] {
  if (!domains) {
    return []
  }
  const list = Array.isArray(domains) ? domains : [domains]
  return list.map((d) => {
    const attrs = d || {}
    return {
      ID: attrs['@_ID'] ? String(attrs['@_ID']) : undefined,
      Name: attrs['@_Name'] ? String(attrs['@_Name']) : '',
      User: attrs['@_User'] ? String(attrs['@_User']) : '',
      Created: attrs['@_Created'] ? String(attrs['@_Created']) : '',
      Expires: attrs['@_Expires'] ? String(attrs['@_Expires']) : '',
      IsExpired: attrs['@_IsExpired'] === 'true',
      IsLocked: attrs['@_IsLocked'] === 'true',
      AutoRenew: attrs['@_AutoRenew'] === 'true',
      WhoisGuard: attrs['@_WhoisGuard'] ? String(attrs['@_WhoisGuard']) : '',
    }
  })
}

function extractXmlErrors(parsed: any): string | undefined {
  const errors = parsed?.ApiResponse?.Errors?.Error
  if (!errors) {
    return undefined
  }
  const list = Array.isArray(errors) ? errors : [errors]
  const first = list[0]
  if (!first) {
    return undefined
  }
  const message = typeof first === 'string' ? first : first['#text'] || first.__cdata || 'Namecheap API 错误'
  return message
}

function parseXmlOrThrow(xml: string): any {
  try {
    return xmlParser.parse(xml)
  }
  catch (error: any) {
    throw new Error(`解析 Namecheap XML 响应失败: ${error.message || error}`)
  }
}

export class NamecheapApiClient {
  private apiUrl: string
  private apiUser: string
  private apiKey: string
  private clientIp: string

  constructor(config: NamecheapConfig) {
    this.apiUrl = config.apiUrl || NAMECHEAP_DEFAULT_API_URL
    this.apiUser = config.apiUser
    this.apiKey = config.apiKey
    this.clientIp = config.clientIp
  }

  private buildQueryParams(command: string, extra: Record<string, string | number | undefined> = {}): Record<string, string> {
    const timestamp = toTimestamp(new Date())
    const signature = hmacSha1(this.apiKey, `${this.apiUser}|${this.apiKey}|${timestamp}`)

    const params: Record<string, string> = {
      ApiUser: this.apiUser,
      ApiKey: signature,
      UserName: this.apiUser,
      Command: command,
      ClientIp: this.clientIp,
    }
    for (const [key, value] of Object.entries(extra)) {
      if (value !== undefined && value !== null) {
        params[key] = String(value)
      }
    }
    return params
  }

  private async request<T = unknown>(
    command: string,
    extra: Record<string, string | number | undefined> = {},
  ): Promise<NamecheapApiResult<T>> {
    try {
      const params = this.buildQueryParams(command, extra)
      const query = new URLSearchParams(params).toString()
      const url = `${this.apiUrl}?${query}`

      const response = await fetch(url, { method: 'GET' })
      const xml = await response.text()

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status} ${response.statusText}`,
          code: String(response.status),
          raw: xml,
        }
      }

      const parsed = parseXmlOrThrow(xml)
      const status = parsed?.ApiResponse?.['@_Status']
      const errorMessage = extractXmlErrors(parsed)

      if (status !== 'OK' || errorMessage) {
        return {
          success: false,
          error: errorMessage || 'Namecheap API 状态异常',
          code: status,
          raw: parsed,
        }
      }

      return {
        success: true,
        data: parsed as T,
        raw: parsed,
      }
    }
    catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Namecheap API 请求失败',
        raw: error,
      }
    }
  }

  // --- 域名相关 ---

  /**
   * 获取账号下的域名列表
   */
  async getDomains(
    page = 1,
    pageSize = 100,
  ): Promise<NamecheapApiResult<any[]>> {
    const resp = await this.request<any>('namecheap.domains.getList', {
      Page: page,
      PageSize: pageSize,
    })
    if (!resp.success) {
      return resp
    }
    const raw = resp.raw as any
    const domains = raw?.ApiResponse?.CommandResponse?.DomainGetListResult?.Domain
    return { success: true, data: normalizeDomainList(domains), raw }
  }

  /**
   * 获取单个域名的详细信息
   */
  async getDomainInfo(domain: string): Promise<NamecheapApiResult<any>> {
    const match = domain.match(SLD_TLD_REGEX)
    if (!match) {
      return { success: false, error: `域名格式错误: ${domain}` }
    }
    const [, SLD, TLD] = match
    const resp = await this.request<any>('namecheap.domains.getInfo', {
      SLD,
      TLD,
    })
    if (!resp.success) {
      return resp
    }
    const raw = resp.raw as any
    const info = raw?.ApiResponse?.CommandResponse?.DomainInfo
    if (!info) {
      return { success: false, error: '未找到域名信息', raw }
    }
    return {
      success: true,
      data: {
        ID: info['@_ID'] ? String(info['@_ID']) : undefined,
        Name: info['@_DomainName'] || domain,
        OwnerName: info['@_OwnerName'] ? String(info['@_OwnerName']) : '',
        Created: info['@_Created'] ? String(info['@_Created']) : '',
        Expires: info['@_ExpiredDate'] || info['@_Expires'] ? String(info['@_ExpiredDate'] || info['@_Expires']) : '',
        IsExpired: info['@_IsExpired'] === 'true',
        IsLocked: info['@_IsLocked'] === 'true',
        AutoRenew: info['@_AutoRenew'] === 'true',
        DnsDetails: info.DnsDetails,
        Whoisguard: info.Whoisguard,
      },
      raw,
    }
  }

  // --- DNS 记录相关 ---

  /**
   * 获取域名 DNS 记录（为 setHosts 提供基础数据）
   */
  async getHosts(domain: string): Promise<NamecheapApiResult<any[]>> {
    const match = domain.match(SLD_TLD_REGEX)
    if (!match) {
      return { success: false, error: `域名格式错误: ${domain}` }
    }
    const [, SLD, TLD] = match
    const resp = await this.request<any>('namecheap.domains.dns.getHosts', {
      SLD,
      TLD,
    })
    if (!resp.success) {
      return resp
    }
    const raw = resp.raw as any
    let hosts = raw?.ApiResponse?.CommandResponse?.DomainDNSGetHostsResult?.host
    // 有时候响应字段名是 `Host`，有时候是 `host`
    if (!hosts) {
      hosts = raw?.ApiResponse?.CommandResponse?.DomainDNSGetHostsResult?.Host
    }
    return { success: true, data: normalizeHostList(hosts), raw }
  }

  /**
   * 全量写入 DNS 记录（覆盖式）
   *
   * @param domain 完整域名（例如 example.com）
   * @param hosts 记录数组；Namecheap 要求使用 `HostName{i}`, `RecordType{i}`, `Address{i}`, `TTL{i}`, `MXPref{i}` 的序列参数
   */
  async setHosts(
    domain: string,
    hosts: { Name: string, Type: string, Address: string, TTL: number, MXPref?: number }[],
  ): Promise<NamecheapApiResult<{ domain: string, count: number }>> {
    const match = domain.match(SLD_TLD_REGEX)
    if (!match) {
      return { success: false, error: `域名格式错误: ${domain}` }
    }
    const [, SLD, TLD] = match

    const params: Record<string, string | number | undefined> = { SLD, TLD }
    hosts.forEach((h, idx) => {
      const i = idx + 1
      params[`HostName${i}`] = h.Name
      params[`RecordType${i}`] = h.Type
      params[`Address${i}`] = h.Address
      params[`TTL${i}`] = h.TTL || 1800
      if (h.MXPref !== undefined && h.MXPref !== null) {
        params[`MXPref${i}`] = h.MXPref
      }
    })

    const resp = await this.request<any>('namecheap.domains.dns.setHosts', params)
    if (!resp.success) {
      return resp
    }
    return { success: true, data: { domain, count: hosts.length }, raw: resp.raw }
  }

  // --- 续期相关 ---

  /**
   * 续期域名
   */
  async renewDomain(
    domain: string,
    years = 1,
  ): Promise<NamecheapApiResult<{ orderId: string, expDate: string, domain: string }>> {
    const match = domain.match(SLD_TLD_REGEX)
    if (!match) {
      return { success: false, error: `域名格式错误: ${domain}` }
    }
    const [, SLD, TLD] = match
    const resp = await this.request<any>('namecheap.domains.renew', {
      SLD,
      TLD,
      Years: years,
    })
    if (!resp.success) {
      return resp
    }
    const raw = resp.raw as any
    const renewResult = raw?.ApiResponse?.CommandResponse?.DomainRenewResult
    return {
      success: true,
      data: {
        orderId: renewResult?.['@_OrderID'] ? String(renewResult['@_OrderID']) : '',
        expDate: renewResult?.['@_ExpiredDate'] ? String(renewResult['@_ExpiredDate']) : '',
        domain: renewResult?.['@_DomainName'] || domain,
      },
      raw,
    }
  }
}
