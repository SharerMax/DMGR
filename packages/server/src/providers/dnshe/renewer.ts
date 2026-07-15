/**
 * DNSHE 域名续期器实现
 *
 * 通过 DNSHE API 执行子域名续期。
 * 续期后返回 new_expires_at 作为新的过期日期。
 */

import type { RenewalResult } from '../base'
import { DNSProviderFactory, DomainRenewer } from '../base'
import { DnsheApiClient } from './apiClient'

interface DnsheRenewerConfig {
  apiKey: string
  apiSecret: string
  apiUrl?: string
}

export class DnsheRenewer extends DomainRenewer {
  readonly id = 'dnshe'
  readonly name = 'DNSHE'

  private apiClient: DnsheApiClient

  constructor(config: DnsheRenewerConfig) {
    super(config)
    this.apiClient = new DnsheApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient
  }

  /**
   * 查询域名续期资格
   * DNSHE 没有专门的续期资格查询接口，通过域名详情判断状态
   */
  async checkRenewalEligibility(domain: string): Promise<{
    eligible: boolean
    reason?: string
    currentExpiryDate?: string
    maxRenewalYears?: number
  }> {
    const subdomainResult = await this.apiClient.findSubdomainIdByDomain(domain)
    if (!subdomainResult.success || !subdomainResult.data) {
      return {
        eligible: false,
        reason: subdomainResult.error || `未找到域名 ${domain}`,
      }
    }

    const detailResult = await this.apiClient.getSubdomain(subdomainResult.data)
    if (!detailResult.success || !detailResult.data) {
      return {
        eligible: false,
        reason: detailResult.error || '获取域名详情失败',
      }
    }

    const subdomain = detailResult.data.subdomain
    if (!subdomain) {
      return { eligible: false, reason: '域名详情响应格式异常' }
    }

    // 暂停或过期状态不可续期
    if (subdomain.status === 'suspended') {
      return {
        eligible: false,
        reason: '域名已暂停，无法续期',
        currentExpiryDate: subdomain.expires_at ?? undefined,
      }
    }

    if (subdomain.status === 'expired') {
      return {
        eligible: false,
        reason: '域名已过期，无法续期',
        currentExpiryDate: subdomain.expires_at ?? undefined,
      }
    }

    return {
      eligible: true,
      currentExpiryDate: subdomain.expires_at ?? undefined,
      maxRenewalYears: 1,
    }
  }

  /**
   * 执行域名续期
   * DNSHE 续期接口会扣费（免费续期或账户余额扣费），返回新的过期日期
   */
  async renewDomain(domain: string, _years?: number): Promise<RenewalResult> {
    const subdomainResult = await this.apiClient.findSubdomainIdByDomain(domain)
    if (!subdomainResult.success || !subdomainResult.data) {
      return {
        success: false,
        error: subdomainResult.error || `未找到域名 ${domain}`,
      }
    }

    const renewResult = await this.apiClient.renewSubdomain(subdomainResult.data)
    if (!renewResult.success || !renewResult.data) {
      return {
        success: false,
        error: renewResult.error || '续期请求失败',
      }
    }

    return {
      success: true,
      newExpiryDate: renewResult.data.new_expires_at,
    }
  }
}

DNSProviderFactory.registerRenewer('dnshe', DnsheRenewer)
