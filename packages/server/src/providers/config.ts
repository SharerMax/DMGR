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
    features: { domainSync: true, dnsManagement: true, autoRenew: true },
    maxRenewalDays: 30,
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
    features: { domainSync: true, dnsManagement: true, autoRenew: true },
    maxRenewalDays: 60,
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
    features: { domainSync: true, dnsManagement: true, autoRenew: false },
  },
  {
    id: 'dnshe',
    name: 'DNSHE',
    description: 'DNSHE 免费域名服务',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'cfsd_xxxxxxxxxx',
        description: 'DNSHE API Key（以 cfsd_ 开头）',
      },
      {
        key: 'apiSecret',
        label: 'API Secret',
        type: 'password',
        required: true,
        placeholder: '输入 API Secret',
        description: 'DNSHE API Secret（创建密钥时仅显示一次，请妥善保存）',
      },
    ],
    features: { domainSync: true, dnsManagement: true, autoRenew: true },
    maxRenewalDays: 30,
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
    features: { domainSync: true, dnsManagement: true, autoRenew: false },
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
    features: { domainSync: true, dnsManagement: true, autoRenew: true },
    maxRenewalDays: 90,
  },
  {
    id: 'vps8',
    name: 'VPS8',
    description: 'VPS8 域名服务',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: '输入 API Key',
        description: 'VPS8 API Key',
      },
    ],
    features: { domainSync: true, dnsManagement: true, autoRenew: false },
  },
  {
    id: 'gleam',
    name: 'Gleam',
    description: 'Gleam 子域名管理服务',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'hl6_xxxxxxxxxxxx',
        description: 'Gleam API Key（以 hl6_ 开头）',
      },
    ],
    features: { domainSync: true, dnsManagement: true, autoRenew: false },
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
