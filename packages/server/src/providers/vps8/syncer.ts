import type { DNSOperationResult, DNSRecordOutput, DomainInfo, SyncResult } from '../base'
import { Buffer } from 'node:buffer'
import { DomainSyncer } from '../base'

// VPS8 API 地址（预留）
const VPS8_API_URL = 'https://vps8.zz.cd/api/client/dnsopenapi'
/**
 * VPS8 API 响应
 * @template T - 响应数据类型
 *
 * @example 响应示例
 * {
  "result": [
    {
      "id": 12105,
      "host": "@",
      "type": "CNAME",
      "value": "fb6992c6f5decd38.gw.i8.al",
      "ttl": 3600,
      "priority": 0,
      "provider_record_id": "6a081632853c4"
    }
  ],
  "error": null
}
 */
interface VPS8APIResponse<T = any> {
  result?: T
  error?: string
}

/**
 * VPS8 域名
 *     {
      "domain": "max.cmd.page",
      "platform_type": "self_platform",
      "source_service": "domain",
      "created_at": "2026-05-11 07:14:13",
      "expires_at": "2027-05-11 07:14:14"
    },
 */
interface VPS8SelfPlatformDomain {
  domain: string
  platform_type: string
  source_service: string
  created_at: string
  expires_at: string
}

/**
 * VPS8 其他平台域名
 *     {
      "domain": "z.im-a.org",
      "platform_type": "hosted",
      "source_service": "dns"
    }
 */
interface VPS8OtherPlatformDomain {
  domain: string
  platform_type: string
  source_service: string
}

type VPS8Domain = VPS8SelfPlatformDomain | VPS8OtherPlatformDomain

export class VPS8Syncer extends DomainSyncer {
  readonly id: string = 'vps8'
  readonly name: string = 'VPS8'
  constructor(config: { apiKey: string }) {
    super(config)
  }

  private async request<T = any>(
    apiPath: string,
    requestParams: Record<string, any> = {},
  ): Promise<VPS8APIResponse<T>> {
    const response = await fetch(`${VPS8_API_URL}/${apiPath}`, {
      method: 'POST',
      headers: {
        // VPS8 API 要求请求体为 JSON 格式
        'Content-Type': 'application/json',
        // VPS8 API 要求 Basic Auth 认证 默认用户名为 client
        'Authorization': `Basic ${Buffer.from(`client:${this.apiKey}`).toString('base64')}`,
      },
      body: JSON.stringify(requestParams),
    })
    const data = await response.json()
    return data as VPS8APIResponse<T>
  }

  validateConfig(): boolean {
    return this.apiKey !== ''
  }

  getAccountInfo(): Promise<DNSOperationResult<any>> {
    throw new Error('Method not implemented.')
  }

  async listDomains(): Promise<DNSOperationResult<DomainInfo[]>> {
    const response = await this.request<VPS8Domain[]>('/domain_list')
    if (response.error) {
      return {
        success: false,
        error: response.error || '获取域名列表失败',
      }
    }
    return {
      success: true,
      data: response.result?.map((domain: VPS8Domain) => ({
        name: domain.domain,
        expirationDate: '',
        status: domain.platform_type === 'self_platform' ? 'active' : 'inactive',
      })) || [],
    }
  }

  getDomainInfo(_domain: string): Promise<DNSOperationResult<DomainInfo>> {
    throw new Error('Method not implemented.')
  }

  syncDomains(): Promise<SyncResult> {
    throw new Error('Method not implemented.')
  }

  getDomainRecords(_domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    throw new Error('Method not implemented.')
  }

  syncDomainRecords(_domain: string): Promise<DNSOperationResult<DNSRecordOutput[]>> {
    throw new Error('Method not implemented.')
  }
}
