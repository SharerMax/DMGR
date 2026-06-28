/**
 * 阿里云域名续期器
 */

import type { RenewalResult } from '../base'
import { logger } from '../../utils/index.js'
import { DNSProviderFactory, DomainRenewer } from '../base'
import { AliyunApiClient } from './apiClient'

interface AliyunRenewerConfig {
  accessKeyId: string
  accessKeySecret: string
  region?: string
  apiUrl?: string
}

export class AliyunDomainRenewer extends DomainRenewer {
  readonly id = 'aliyun'
  readonly name = '阿里云'

  private config: AliyunRenewerConfig
  private apiClient: AliyunApiClient

  constructor(config: AliyunRenewerConfig) {
    super(config)
    this.config = { region: 'cn-hangzhou', ...config }
    this.apiClient = new AliyunApiClient(this.config)
  }

  validateConfig(): boolean {
    return !!(this.config.accessKeyId && this.config.accessKeySecret)
  }

  async checkRenewalEligibility(domain: string): Promise<{
    eligible: boolean
    reason?: string
    currentExpiryDate?: string
    maxRenewalYears?: number
  }> {
    if (!this.validateConfig()) {
      return { eligible: false, reason: '缺少阿里云 API 凭证' }
    }

    logger.warn({ domain }, 'Aliyun renewal eligibility check not implemented, returning mock data')

    return {
      eligible: true,
      currentExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      maxRenewalYears: 3,
    }
  }

  async renewDomain(domain: string, years = 1): Promise<RenewalResult> {
    if (!this.validateConfig()) {
      return { success: false, error: '缺少阿里云 API 凭证' }
    }

    logger.warn({ domain, years }, 'Aliyun renewal API not implemented, simulating success')

    const newExpiry = new Date()
    newExpiry.setFullYear(newExpiry.getFullYear() + years)

    return {
      success: true,
      newExpiryDate: newExpiry.toISOString().split('T')[0],
      orderId: `mock-${Date.now()}`,
    }
  }
}

DNSProviderFactory.registerRenewer('aliyun', AliyunDomainRenewer)
