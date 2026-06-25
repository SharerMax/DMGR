/**
 * 内置服务商配置列表
 *
 * 此文件维护所有支持的服务商类型配置
 * 添加新的服务商时，只需在此文件添加配置即可
 */

import type { ProviderConfig } from './base'

export const BUILT_IN_PROVIDERS: ProviderConfig[] = [
  {
    id: 'aliyun',
    name: '阿里云',
    description: '阿里云域名服务',
    fields: [
      {
        key: 'accessKeyId',
        label: 'AccessKey ID',
        type: 'text',
        required: true,
        placeholder: '输入 AccessKey ID',
        description: '阿里云 AccessKey ID',
      },
      {
        key: 'accessKeySecret',
        label: 'AccessKey Secret',
        type: 'password',
        required: true,
        placeholder: '输入 AccessKey Secret',
        description: '阿里云 AccessKey Secret',
      },
    ],
    supportsAutoRenew: true,
    maxRenewalDays: 30, // 阿里云支持过期前30天内续期
    features: ['域名同步', 'DNS管理', '自动续期'],
  },
  {
    id: 'tencent',
    name: '腾讯云',
    description: '腾讯云域名服务',
    fields: [
      {
        key: 'secretId',
        label: 'SecretId',
        type: 'text',
        required: true,
        placeholder: '输入 SecretId',
        description: '腾讯云 SecretId',
      },
      {
        key: 'secretKey',
        label: 'SecretKey',
        type: 'password',
        required: true,
        placeholder: '输入 SecretKey',
        description: '腾讯云 SecretKey',
      },
    ],
    supportsAutoRenew: true,
    maxRenewalDays: 60, // 腾讯云支持过期前60天内续期
    features: ['域名同步', 'DNS管理', '自动续期'],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'Cloudflare DNS 服务',
    fields: [
      {
        key: 'apiToken',
        label: 'API Token',
        type: 'password',
        required: true,
        placeholder: '输入 API Token',
        description: 'Cloudflare API Token',
      },
      {
        key: 'email',
        label: '邮箱',
        type: 'text',
        required: false,
        placeholder: '输入 Cloudflare 邮箱',
        description: 'Cloudflare 账户邮箱',
      },
    ],
    supportsAutoRenew: false,
    features: ['DNS管理'],
  },
  {
    id: 'dnspod',
    name: 'DNSPod',
    description: 'DNSPod 域名服务',
    fields: [
      {
        key: 'loginToken',
        label: '登录 Token',
        type: 'password',
        required: true,
        placeholder: '格式: ID,Token',
        description: 'DNSPod API Token，格式: ID,Token',
      },
    ],
    supportsAutoRenew: false,
    features: ['DNS管理'],
  },
  {
    id: 'namecheap',
    name: 'Namecheap',
    description: 'Namecheap 域名服务',
    fields: [
      {
        key: 'apiUser',
        label: 'API 用户名',
        type: 'text',
        required: true,
        placeholder: '输入 API 用户名',
        description: 'Namecheap API 用户名',
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '输入 API Key',
        description: 'Namecheap API Key',
      },
      {
        key: 'clientIp',
        label: '客户端 IP',
        type: 'text',
        required: true,
        placeholder: '输入当前公网 IP',
        description: '用于 API 验证的公网 IP',
      },
    ],
    supportsAutoRenew: true,
    maxRenewalDays: 90, // Namecheap 支持过期前90天内续期
    features: ['域名同步', 'DNS管理'],
  },
  {
    id: 'custom',
    name: '自定义',
    description: '自定义服务商（使用 API URL）',
    fields: [
      {
        key: 'apiUrl',
        label: 'API 地址',
        type: 'url',
        required: true,
        placeholder: 'https://api.example.com',
        description: '服务商 API 地址',
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'text',
        required: true,
        placeholder: '输入 API Key',
        description: 'API 密钥',
      },
      {
        key: 'apiSecret',
        label: 'API Secret',
        type: 'password',
        required: false,
        placeholder: '输入 API Secret',
        description: 'API 密钥（可选）',
      },
    ],
    supportsAutoRenew: false,
    features: ['域名同步'],
  },
]

// 根据 ID 获取服务商配置
export function getProviderConfig(id: string): ProviderConfig | undefined {
  return BUILT_IN_PROVIDERS.find(p => p.id === id)
}

// 获取所有支持的服务商列表
export function getAllProviderConfigs(): ProviderConfig[] {
  return [...BUILT_IN_PROVIDERS]
}
