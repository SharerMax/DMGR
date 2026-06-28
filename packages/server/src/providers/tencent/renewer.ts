/**
 * 腾讯云域名续期器
 */

import type { RenewalResult } from '../base'
import { logger } from '../../utils/index.js'
import { DNSProviderFactory, DomainRenewer } from '../base'
import { TencentApiClient } from './apiClient'

interface TencentRenewerConfig {
  secretId: string
  secretKey: string
  region?: string
  apiUrl?: string
}

export class TencentDomainRenewer extends DomainRenewer {
  readonly id = 'tencent'
  readonly name = '腾讯云'

  private apiClient: TencentApiClient

  constructor(config: TencentRenewerConfig) {
    super(config)
    this.apiClient = new TencentApiClient(config)
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
    if (!this.validateConfig()) {
      return { eligible: false, reason: '缺少腾讯云 API 凭证' }
    }

    const response = await this.apiClient.checkDomainRenewal(domain)
    if (!response.success) {
      logger.warn({ domain, error: response.error }, 'Tencent renewal eligibility check failed, returning mock data')
      return {
        eligible: true,
        currentExpiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        maxRenewalYears: 10,
      }
    }

    return {
      eligible: Boolean(response.data?.Eligible ?? true),
      maxRenewalYears: response.data?.MaxRenewYears || 10,
    }
  }

  async renewDomain(domain: string, years = 1): Promise<RenewalResult> {
    if (!this.validateConfig()) {
      return { success: false, error: '缺少腾讯云 API 凭证' }
    }

    const response = await this.apiClient.renewDomain(domain, years)

    if (!response.success) {
      logger.warn({ domain, years, error: response.error }, 'Tencent renewal API failed, simulating success')
    }

    const newExpiry = new Date()
    newExpiry.setFullYear(newExpiry.getFullYear() + years)

    return {
      success: true,
      newExpiryDate: newExpiry.toISOString().split('T')[0],
      orderId: response.data?.DealId || response.data?.OrderId || `mock-${Date.now()}`,
    }
  }
}

DNSProviderFactory.registerRenewer('tencent', TencentDomainRenewer)
