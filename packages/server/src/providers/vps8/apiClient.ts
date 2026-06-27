/**
 * VPS8 API 客户端
 * 封装 VPS8 OpenAPI 调用，供 provider/syncer 共用
 */

import type { ApiClientResponse, BaseApiClientConfig } from '../base'
import { Buffer } from 'node:buffer'
import { BaseApiClient } from '../base'

interface VPS8Config extends BaseApiClientConfig {
  apiKey: string
}

interface VPS8RawResponse<T = any> {
  result?: T
  error?: string
}

const VPS8_API_URL = 'https://vps8.zz.cd/api/client/dnsopenapi'

export class VPS8ApiClient extends BaseApiClient {
  constructor(config: VPS8Config) {
    super({
      ...config,
      apiUrl: config.apiUrl || VPS8_API_URL,
    })
  }

  /**
   * 构建 VPS8 请求头（含 Basic Auth）
   */
  protected override buildHeaders(): Record<string, string> {
    const apiKey = this.config.apiKey || ''
    const token = Buffer.from(`client:${apiKey}`).toString('base64')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${token}`,
    }
  }

  /**
   * 调用 VPS8 OpenAPI
   *
   * @param apiPath API 路径，如 /record_list / record_create
   * @param params 请求参数（放入 POST body）
   */
  async request<T = any>(
    apiPath: string,
    params: Record<string, any> = {},
  ): Promise<ApiClientResponse<T>> {
    const response = await this.httpRequest<VPS8RawResponse<T>>(apiPath, {
      method: 'POST',
      body: params,
    })

    // VPS8 通过 error 字段表示业务错误
    const raw = response.raw as VPS8RawResponse<T> | undefined
    if (raw?.error) {
      return {
        success: false,
        error: raw.error,
        raw,
      }
    }

    if (!response.success) {
      return {
        success: false,
        error: response.error,
        raw: response.raw,
      }
    }

    return {
      success: true,
      data: raw?.result,
      raw,
    }
  }
}
