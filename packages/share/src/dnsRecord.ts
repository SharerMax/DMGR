/** DNS 记录类型 */
export type DNSRecordType
  = | 'A'
    | 'AAAA'
    | 'CNAME'
    | 'MX'
    | 'TXT'
    | 'NS'
    | 'SRV'
    | 'CAA'
    | 'PTR'
    | 'SOA'

/** DNS 记录实体（API 响应格式） */
export interface DNSRecord {
  id: number
  domainId: number
  type: DNSRecordType
  name: string
  value: string
  ttl: number
  priority: number | null
  createdAt: string
  updatedAt: string
}

/** 创建 DNS 记录输入（API 请求体） */
export interface CreateDNSRecordInput {
  domainId: number
  type: DNSRecordType
  name: string
  value: string
  ttl?: number
  priority?: number | null
}

/** 更新 DNS 记录输入 */
export interface UpdateDNSRecordInput {
  type?: DNSRecordType
  name?: string
  value?: string
  ttl?: number
  priority?: number
}
