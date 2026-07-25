/**
 * NS 检查服务器配置服务
 *
 * 用于域名 NS 记录查询时的 DNS 解析服务器地址配置。
 *
 * 支持的服务器地址格式：
 * - 裸 IP 或 hostname（如 8.8.8.8）→ UDP DNS（端口 53，使用 node:dns Resolver）
 * - `udp://HOST[:PORT]`             → UDP DNS（显式）
 * - `tcp://HOST[:PORT]`             → DNS over TCP（默认端口 53）
 * - `dot://HOST[:PORT]` 或 `tls://` → DNS over TLS（默认端口 853）
 * - `http://URL` / `https://URL`    → DoH (DNS over HTTPS)
 *
 * server 为空时使用系统默认 DNS。
 */

import type { NsCheckSetting, NsCheckTestInput, NsCheckTestResult, UpdateNsCheckSettingInput } from 'share'
import { Resolver } from 'node:dns/promises'
import { queryNsOverTcp, queryNsOverTls } from '@/utils/dnsProtocol.js'
import { logger } from '@/utils/index.js'
import { getNsCheckSetting, upsertNsCheckSetting } from '../models/nsCheckSetting.js'

const DEFAULT_DNS_PORT = 53
const DEFAULT_DOT_PORT = 853

type DnsProtocol = 'udp' | 'tcp' | 'dot' | 'doh'

interface ParsedDnsServer {
  protocol: DnsProtocol
  host: string
  port: number
  raw: string
}

/**
 * 解析 DNS 服务器地址，识别协议、主机、端口
 */
function parseDnsServer(server: string): ParsedDnsServer {
  // DoH：HTTP(S) URL
  if (server.startsWith('http://') || server.startsWith('https://')) {
    return { protocol: 'doh', host: server, port: 0, raw: server }
  }

  // 协议前缀
  const prefixMatch = server.match(/^(udp|tcp|dot|tls):\/\//)
  let protocol: DnsProtocol = 'udp'
  let addressPart = server
  if (prefixMatch) {
    const proto = prefixMatch[1]
    if (proto === 'tls') {
      protocol = 'dot'
    }
    else {
      protocol = proto as DnsProtocol
    }
    addressPart = server.slice(prefixMatch[0].length)
  }

  // 解析 host:port
  let host: string
  let port: number | undefined

  if (addressPart.startsWith('[')) {
    // IPv6：[::1]:53 或 [::1]
    const bracketEnd = addressPart.indexOf(']')
    if (bracketEnd === -1) {
      throw new Error('IPv6 地址格式错误，缺少 ]')
    }
    host = addressPart.slice(1, bracketEnd)
    const after = addressPart.slice(bracketEnd + 1)
    if (after.startsWith(':')) {
      const p = Number.parseInt(after.slice(1), 10)
      if (!Number.isNaN(p) && p > 0 && p <= 65535)
        port = p
    }
  }
  else {
    // IPv4 或 hostname（最后一个冒号作为端口分隔符）
    const lastColon = addressPart.lastIndexOf(':')
    if (lastColon > 0) {
      const portStr = addressPart.slice(lastColon + 1)
      const p = Number.parseInt(portStr, 10)
      if (!Number.isNaN(p) && p > 0 && p <= 65535) {
        host = addressPart.slice(0, lastColon)
        port = p
      }
      else {
        host = addressPart
      }
    }
    else {
      host = addressPart
    }
  }

  if (!host) {
    throw new Error('DNS 服务器地址缺少主机')
  }

  const defaultPort = protocol === 'dot' ? DEFAULT_DOT_PORT : DEFAULT_DNS_PORT
  return {
    protocol,
    host,
    port: port ?? defaultPort,
    raw: server,
  }
}

/**
 * 获取 NS 检查服务器配置（API 响应）
 */
export async function getNsCheckSettingForApi(): Promise<NsCheckSetting> {
  const dbSetting = await getNsCheckSetting()
  const server = dbSetting?.server ?? ''
  return {
    server,
    configured: !!server,
  }
}

/**
 * 更新 NS 检查服务器配置
 */
export async function updateNsCheckSetting(
  input: UpdateNsCheckSettingInput,
): Promise<void> {
  const dbData: { server?: string | null } = {}

  if (input.server !== undefined)
    dbData.server = input.server || null

  await upsertNsCheckSetting(dbData)
  logger.info('NS check settings updated')
}

/**
 * 测试 NS 检查服务器
 *
 * 根据地址格式自动选择协议（UDP / TCP / DoT / DoH），
 * 当 server 为空时使用系统默认 DNS。
 */
export async function testNsCheck(
  input: NsCheckTestInput,
): Promise<NsCheckTestResult> {
  const startTime = Date.now()
  const server = (input.server ?? '').trim()
  const domain = input.domain.trim()
  const effectiveServer = server || 'system'

  try {
    let records: string[]

    if (!server) {
      // 系统默认 DNS（UDP）
      const resolver = new Resolver()
      records = await resolver.resolveNs(domain)
      records = records.map(r => r.replace(/\.$/, ''))
    }
    else {
      const parsed = parseDnsServer(server)
      switch (parsed.protocol) {
        case 'doh':
          records = await resolveNsViaDoh(parsed.host, domain)
          break
        case 'udp':
          records = await resolveNsViaUdp(parsed.host, domain)
          break
        case 'tcp':
          records = await queryNsOverTcp(parsed.host, parsed.port, domain)
          break
        case 'dot':
          records = await queryNsOverTls(parsed.host, parsed.port, domain)
          break
      }
    }

    return {
      success: true,
      server: effectiveServer,
      domain,
      records,
      durationMs: Date.now() - startTime,
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      server: effectiveServer,
      domain,
      records: [],
      error: message,
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * 通过 UDP（node:dns Resolver）查询 NS 记录
 */
async function resolveNsViaUdp(server: string, domain: string): Promise<string[]> {
  const resolver = new Resolver()
  resolver.setServers([server])
  const records = await resolver.resolveNs(domain)
  return records.map(r => r.replace(/\.$/, ''))
}

/**
 * 通过 DoH (DNS over HTTPS) 查询 NS 记录
 * 兼容 Google DoH (https://dns.google/resolve) 与 Cloudflare DoH (https://cloudflare-dns.com/dns-query)
 */
async function resolveNsViaDoh(serverUrl: string, domain: string): Promise<string[]> {
  const url = new URL(serverUrl)
  url.searchParams.set('name', domain)
  url.searchParams.set('type', 'NS')

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/dns-json' },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`DoH 服务器返回 HTTP ${response.status}`)
  }

  const data = await response.json() as {
    Status: number
    Answer?: Array<{ name: string, type: number, data: string }>
  }

  if (data.Status !== 0) {
    throw new Error(`DoH 查询失败，DNS 状态码: ${data.Status}`)
  }

  // type 2 = NS record (RFC 1035)
  const records = (data.Answer ?? [])
    .filter(a => a.type === 2)
    .map(a => a.data.replace(/\.$/, ''))

  if (records.length === 0) {
    throw new Error('未查询到 NS 记录')
  }

  return records
}
