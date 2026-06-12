import path from 'node:path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import { PrismaClient } from './generated/client'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
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

  console.log('Created user:', user.username)

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
      supportsAutoRenew: true,
      userId: user.id,
    },
  })

  console.log('Created provider:', provider.name)

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
      renewalPrice: 59.0,
      status: 'active',
      notes: '测试域名',
    },
  })

  console.log('Created domain:', domain.name)

  // Create reminder
  await prisma.reminder.upsert({
    where: { id: 1 },
    update: {},
    create: {
      domainId: domain.id,
      daysBefore: 7,
      notified: false,
    },
  })

  console.log('Created reminder for domain:', domain.name)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
