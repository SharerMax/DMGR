/**
 * 阿里云 API 客户端
 * 封装阿里云 OpenAPI 调用，供 provider/syncer/renewer 共用
 */

import type { ApiClientResponse, BaseApiClientConfig } from '../base'
import { BaseApiClient } from '../base'

interface AliyunConfig extends BaseApiClientConfig {
  apiKey: string
  apiSecret: string
  region?: string
}

interface AliyunRawResponse<T = any> {
  RequestId: string
  Code?: string
  Message?: string
  Data?: T
}

export class AliyunApiClient extends BaseApiClient {
  private region: string

  constructor(config: AliyunConfig) {
    super({
      ...config,
      apiUrl: config.apiUrl || '',
    })
    this.region = config.region || 'cn-hangzhou'
  }

  /**
   * 构建阿里云 API 请求头
   * 预留：实际阿里云 OpenAPI 需要签名机制（Signature Version 1.0）
   * 当前为 mock 实现，真实场景建议使用 @alicloud/pop-core SDK
   */
  protected override buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-acs-version': '2015-01-09',
    }
  }

  /**
   * 生成阿里云 API 签名（mock 实现，返回空字符串）
   * 实际实现：使用阿里云 OpenAPI Signature Version 1.0 或接入 SDK
   */
  private generateSignature(_params: Record<string, any> = {}): string {
    return ''
  }

  /**
   * 调用阿里云 OpenAPI
   *
   * @param action API Action 名称，如 DescribeDomainRecords / AddDomainRecord
   * @param params Action 对应的业务参数
   */
  async request<T = any>(
    action: string,
    params: Record<string, any> = {},
  ): Promise<ApiClientResponse<T>> {
    const signature = this.generateSignature(params)

    const response = await this.httpRequest<AliyunRawResponse<T>>('', {
      method: 'POST',
      query: {
        Action: action,
        Version: '2015-01-09',
        Format: 'json',
        AccessKeyId: this.config.apiKey,
        Signature: signature,
        SignatureMethod: 'HMAC-SHA1',
        SignatureVersion: '1.0',
        SignatureNonce: Math.random().toString(36).substring(2),
        Timestamp: new Date().toISOString(),
        ...params,
      },
    })

    // 阿里云通过 Code/Message 表示业务错误
    const raw = response.raw as AliyunRawResponse<T> | undefined
    if (raw?.Code) {
      return {
        success: false,
        error: raw.Message || `阿里云 API 错误: ${raw.Code}`,
        code: raw.Code,
        raw,
      }
    }

    if (!response.success) {
      return {
        success: false,
        error: response.error,
        code: response.code,
        raw: response.raw,
      }
    }

    return {
      success: true,
      data: raw?.Data as T,
      raw,
    }
  }
}
