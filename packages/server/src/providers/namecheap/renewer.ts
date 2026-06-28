/**
 * Namecheap 域名续期器
 */

import type { RenewalResult } from '../base'
import { DNSProviderFactory, DomainRenewer } from '../base'
import { NamecheapApiClient } from './apiClient'

interface NamecheapRenewerConfig {
  apiUser: string
  apiKey: string
  clientIp: string
  apiUrl?: string
}

export class NamecheapDomainRenewer extends DomainRenewer {
  readonly id = 'namecheap'
  readonly name = 'Namecheap'

  private apiClient: NamecheapApiClient

  constructor(config: NamecheapRenewerConfig) {
    super(config)
    this.apiClient = new NamecheapApiClient(config)
  }

  validateConfig(): boolean {
    return !!this.apiClient
  }

  async checkRenewalEligibility(domain: string): Promise<{
    eligible: boolean
    reason?: string
    currentExpiryDate?: string
    maxRenewalYears?: number
  }> {
    const info = await this.apiClient.getDomainInfo(domain)
    if (!info.success) {
      return {
        eligible: false,
        reason: info.error || '无法获取域名信息',
      }
    }

    const data = info.data as any
    return {
      eligible: !data?.IsExpired,
      currentExpiryDate: data?.Expires || '',
      maxRenewalYears: 10,
    }
  }

  async renewDomain(domain: string, years = 1): Promise<RenewalResult> {
    const response = await this.apiClient.renewDomain(domain, years)

    if (!response.success) {
      return {
        success: false,
        error: response.error || '续期失败',
      }
    }

    const data = response.data as any
    return {
      success: true,
      newExpiryDate: data?.expDate || '',
      orderId: data?.orderId || '',
    }
  }
}

DNSProviderFactory.registerRenewer('namecheap', NamecheapDomainRenewer)
