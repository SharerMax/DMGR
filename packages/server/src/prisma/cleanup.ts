/**
 * 数据库脏数据清理脚本
 *
 * 用法: pnpm --filter server tsx src/prisma/cleanup.ts
 *
 * 清理内容:
 * 1. 孤立 DNS 记录 (domainId 指向已不存在的域名)
 * 2. 孤立域名 (providerId 为 null 且非用户手动创建的域名)
 * 3. Mock 测试数据 (example1.com / example2.com)
 */

import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from './generated/client'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('=== 开始清理脏数据 ===\n')

  // 1. 查找孤立 DNS 记录
  const allDomains = await prisma.domain.findMany({ select: { id: true } })
  const domainIds = new Set(allDomains.map(d => d.id))

  const orphanedDNSRecords = await prisma.dNSRecord.findMany({
    where: { domainId: { notIn: [...domainIds] } },
  })
  if (orphanedDNSRecords.length > 0) {
    console.log(`发现 ${orphanedDNSRecords.length} 条孤立 DNS 记录，正在删除...`)
    await prisma.dNSRecord.deleteMany({
      where: { id: { in: orphanedDNSRecords.map(r => r.id) } },
    })
    console.log('已删除孤立 DNS 记录\n')
  }
  else {
    console.log('✓ 无孤立 DNS 记录')
  }

  // 2. 查找孤立域名 (providerId 为 null)
  const orphanedDomains = await prisma.domain.findMany({
    where: { providerId: null },
    include: { _count: { select: { dnsRecords: true, renewalLogs: true } } },
  })
  if (orphanedDomains.length > 0) {
    console.log(`发现 ${orphanedDomains.length} 个孤立域名 (providerId=null):`)
    for (const d of orphanedDomains) {
      console.log(`  - ID:${d.id} ${d.name} (DNS:${d._count.dnsRecords} RenewalLogs:${d._count.renewalLogs})`)
    }
    console.log('正在删除孤立域名及其关联数据...')
    await prisma.domain.deleteMany({
      where: { id: { in: orphanedDomains.map(d => d.id) } },
    })
    console.log('已删除孤立域名\n')
  }
  else {
    console.log('✓ 无孤立域名')
  }

  // 3. 查找 Mock 测试数据
  const mockDomainNames = ['example1.com', 'example2.com']
  const mockDomains = await prisma.domain.findMany({
    where: { name: { in: mockDomainNames } },
  })
  if (mockDomains.length > 0) {
    console.log(`发现 ${mockDomains.length} 个 Mock 测试域名:`)
    for (const d of mockDomains) {
      console.log(`  - ID:${d.id} ${d.name}`)
    }
    console.log('正在删除 Mock 测试数据...')
    await prisma.domain.deleteMany({
      where: { id: { in: mockDomains.map(d => d.id) } },
    })
    console.log('已删除 Mock 测试数据\n')
  }
  else {
    console.log('✓ 无 Mock 测试数据')
  }

  // 4. 统计清理后的数据
  console.log('=== 清理后数据统计 ===')
  console.log(`Users:          ${await prisma.user.count()}`)
  console.log(`Providers:      ${await prisma.provider.count()}`)
  console.log(`Domains:        ${await prisma.domain.count()}`)
  console.log(`DNS Records:    ${await prisma.dNSRecord.count()}`)
  console.log(`Renewal Logs:   ${await prisma.renewalLog.count()}`)
  console.log('\n=== 清理完成 ===')
}

main()
  .catch((error) => {
    console.error('清理失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
