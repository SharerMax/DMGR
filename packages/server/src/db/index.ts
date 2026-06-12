import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../../prisma/src/generated/prisma/client'
import path from 'node:path'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')

const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
export const prisma = new PrismaClient({ adapter })

export async function initDatabase() {
  try {
    // 测试连接
    await prisma.$connect()
    console.log('Database connected successfully')
  }
  catch (error) {
    console.error('Database connection failed:', error)
    throw error
  }
}

export async function closeDatabase() {
  await prisma.$disconnect()
}
