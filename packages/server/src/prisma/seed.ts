import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import { logger } from '@/utils/index.js'
import { PrismaClient } from './generated/client'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
logger.info({ dbPath }, '数据库路径')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })

const prisma = new PrismaClient({ adapter })

async function main() {
  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 10)
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@example.com',
    },
  })

  logger.info({ username: user.username }, 'Created user')

  // Create test provider
  const provider = await prisma.provider.upsert({
    where: { id: 1 },
    update: {},
    create: {
      type: 'aliyun',
      name: '阿里云',
      config: JSON.stringify({
        accessKeyId: 'test_key_123',
        accessKeySecret: 'test_secret_456',
      }),
      userId: user.id,
    },
  })

  logger.info({ name: provider.name }, 'Created provider')

  // Create test domain
  const domain = await prisma.domain.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'example.com',
      providerId: provider.id,
      userId: user.id,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      autoRenew: true,
      autoRenewDays: 7,
      renewalPrice: 59.0,
      status: 'active',
      notes: '测试域名',
    },
  })

  logger.info({ name: domain.name }, 'Created domain')

  // Create notification channel
  const notificationChannel = await prisma.notificationChannel.upsert({
    where: { id: 1 },
    update: {},
    create: {
      userId: user.id,
      type: 'email',
      name: '管理员邮箱',
      config: JSON.stringify({
        email: 'admin@example.com',
      }),
      isActive: true,
    },
  })

  logger.info({ name: notificationChannel.name }, 'Created notification channel')

  // Create notification config (expiry reminder enabled with 30 days threshold)
  await prisma.notificationConfig.upsert({
    where: { userId_type: { userId: user.id, type: 'expiry_reminder' } },
    update: {},
    create: {
      userId: user.id,
      type: 'expiry_reminder',
      enabled: true,
      expiryDays: 30,
    },
  })

  logger.info('Created notification config for expiry_reminder')

  // Create DNS record
  await prisma.dNSRecord.upsert({
    where: { id: 1 },
    update: {},
    create: {
      domainId: domain.id,
      type: 'A',
      name: '@',
      value: '1.2.3.4',
      ttl: 3600,
    },
  })

  logger.info({ domain: domain.name }, 'Created DNS record for domain')

  // Create renewal log
  await prisma.renewalLog.upsert({
    where: { id: 1 },
    update: {},
    create: {
      domainId: domain.id,
      status: 'completed',
      message: '续期成功',
      renewedAt: new Date(),
    },
  })

  logger.info({ domain: domain.name }, 'Created renewal log for domain')

  // Create notification log
  await prisma.notificationLog.upsert({
    where: { id: 1 },
    update: {},
    create: {
      userId: user.id,
      domainId: domain.id,
      type: 'expiry_reminder',
      content: '域名即将过期，请及时续期',
      channel: 'email',
    },
  })

  logger.info({ domain: domain.name }, 'Created notification log for domain')
}

main()
  .catch((e) => {
    logger.error({ err: e }, 'seed 执行失败')
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
