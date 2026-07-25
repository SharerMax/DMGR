/**
 * DNS 协议封装 - 用于通过 TCP / DoT (TLS) 查询 NS 记录
 *
 * Node 内置的 dns.Resolver 仅支持 UDP（且 DoH 走 fetch）。
 * 本模块手写 DNS wire format，支持 TCP（端口 53）和 DoT（端口 853）。
 *
 * 地址格式约定：
 * - `tcp://HOST[:PORT]`     → DNS over TCP（默认 53）
 * - `dot://HOST[:PORT]`     → DNS over TLS（默认 853）
 * - `tls://HOST[:PORT]`     → 等价于 dot://
 */

import type { Socket } from 'node:net'
import { Buffer } from 'node:buffer'
import { connect as netConnect } from 'node:net'
import { connect as tlsConnect } from 'node:tls'

const DNS_TYPE_NS = 2
const DNS_CLASS_IN = 1
const QUERY_TIMEOUT_MS = 10000
const MAX_COMPRESSION_JUMPS = 20

/**
 * 编码 NS 记录的 DNS 查询报文（RFC 1035）
 */
function encodeNsQuery(domain: string): Buffer {
  // Header: 12 bytes
  const header = Buffer.alloc(12)
  header.writeUInt16BE(0x1234, 0) // ID（任意值）
  header.writeUInt16BE(0x0100, 2) // Flags: standard query, RD=1
  header.writeUInt16BE(1, 4) // QDCOUNT = 1
  header.writeUInt16BE(0, 6) // ANCOUNT
  header.writeUInt16BE(0, 8) // NSCOUNT
  header.writeUInt16BE(0, 10) // ARCOUNT

  // QNAME: 长度前缀标签序列 + 0 终止符
  const labels = domain.replace(/\.$/, '').split('.')
  const labelParts: Buffer[] = []
  for (const label of labels) {
    if (label.length === 0)
      continue
    const part = Buffer.alloc(1 + label.length)
    part.writeUInt8(label.length, 0)
    part.write(label, 1, 'ascii')
    labelParts.push(part)
  }
  labelParts.push(Buffer.from([0]))

  // QTYPE(2) + QCLASS(2)
  const qtypeQclass = Buffer.alloc(4)
  qtypeQclass.writeUInt16BE(DNS_TYPE_NS, 0)
  qtypeQclass.writeUInt16BE(DNS_CLASS_IN, 2)

  return Buffer.concat([header, ...labelParts, qtypeQclass])
}

/**
 * 从 DNS 报文中解析域名（支持压缩指针）
 */
function parseName(buffer: Buffer, offset: number): { name: string, newOffset: number } {
  const labels: string[] = []
  let pos = offset
  let returnPos: number | null = null
  let jumps = 0

  while (pos < buffer.length) {
    const len = buffer.readUInt8(pos)
    if (len === 0) {
      pos += 1
      break
    }
    if ((len & 0xC0) === 0xC0) {
      // 压缩指针（2 字节）
      if (returnPos === null) {
        returnPos = pos + 2
      }
      const pointer = ((len & 0x3F) << 8) | buffer.readUInt8(pos + 1)
      pos = pointer
      jumps += 1
      if (jumps > MAX_COMPRESSION_JUMPS) {
        throw new Error('DNS 报文压缩指针跳转次数过多')
      }
      continue
    }
    labels.push(buffer.toString('ascii', pos + 1, pos + 1 + len))
    pos += 1 + len
  }

  return {
    name: labels.join('.'),
    newOffset: returnPos ?? pos,
  }
}

/**
 * 解码 DNS 响应报文，提取 NS 记录
 */
function decodeNsResponse(buffer: Buffer): string[] {
  if (buffer.length < 12) {
    throw new Error('DNS 响应报文过短')
  }

  const flags = buffer.readUInt16BE(2)
  const rcode = flags & 0x000F
  if (rcode !== 0) {
    throw new Error(`DNS 查询失败，RCODE: ${rcode}`)
  }

  const qdcount = buffer.readUInt16BE(4)
  const ancount = buffer.readUInt16BE(6)
  let offset = 12

  // 跳过 Question 段
  for (let i = 0; i < qdcount; i++) {
    const { newOffset } = parseName(buffer, offset)
    offset = newOffset + 4 // QTYPE(2) + QCLASS(2)
  }

  // 解析 Answer 段
  const records: string[] = []
  for (let i = 0; i < ancount; i++) {
    const { newOffset: nameEnd } = parseName(buffer, offset)
    offset = nameEnd
    const type = buffer.readUInt16BE(offset)
    offset += 2 // TYPE
    offset += 2 // CLASS
    offset += 4 // TTL
    const rdlength = buffer.readUInt16BE(offset)
    offset += 2 // RDLENGTH
    if (type === DNS_TYPE_NS) {
      const { name } = parseName(buffer, offset)
      records.push(name.replace(/\.$/, ''))
    }
    offset += rdlength
  }

  if (records.length === 0) {
    throw new Error('未查询到 NS 记录')
  }

  return records
}

/**
 * 在 TCP 流上读取一条完整的 DNS 响应
 * TCP/DoT 报文格式：2 字节长度前缀（大端）+ DNS 报文
 */
function readFramedMessage(stream: Socket, writeData: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let settled = false

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        stream.destroy()
        reject(new Error(`DNS 查询超时（${QUERY_TIMEOUT_MS}ms）`))
      }
    }, QUERY_TIMEOUT_MS)

    stream.on('data', (chunk: Buffer) => {
      if (settled)
        return
      chunks.push(chunk)
      const total = Buffer.concat(chunks)
      if (total.length >= 2) {
        const expectedLength = total.readUInt16BE(0)
        if (total.length >= 2 + expectedLength) {
          settled = true
          clearTimeout(timeout)
          stream.destroy()
          try {
            const message = total.subarray(2, 2 + expectedLength)
            resolve(message)
          }
          catch (err) {
            reject(err)
          }
        }
      }
    })

    stream.on('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(err)
      }
    })

    stream.write(writeData)
  })
}

/**
 * 通过 TCP 查询 NS 记录
 */
export async function queryNsOverTcp(host: string, port: number, domain: string): Promise<string[]> {
  const query = encodeNsQuery(domain)
  // TCP 框架：2 字节长度前缀
  const framed = Buffer.alloc(2 + query.length)
  framed.writeUInt16BE(query.length, 0)
  query.copy(framed, 2)

  const socket = netConnect({ host, port })
  const message = await readFramedMessage(socket, framed)
  return decodeNsResponse(message)
}

/**
 * 通过 DoT (DNS over TLS) 查询 NS 记录
 *
 * 注意：为兼容 IP 地址直连的 DoT 服务器（如 8.8.8.8:853），
 * 默认跳过证书校验。如需严格校验，请使用域名而非 IP。
 */
export async function queryNsOverTls(host: string, port: number, domain: string): Promise<string[]> {
  const query = encodeNsQuery(domain)
  const framed = Buffer.alloc(2 + query.length)
  framed.writeUInt16BE(query.length, 0)
  query.copy(framed, 2)

  const socket = tlsConnect({
    host,
    port,
    servername: host,
    rejectUnauthorized: false, // 兼容 IP 直连，证书可能不匹配 IP
  })
  const message = await readFramedMessage(socket, framed)
  return decodeNsResponse(message)
}
