import cors from 'cors'
import express from 'express'
import { initDatabase } from './db/index.js'
import authRoutes from './routes/auth.js'
import dnsRecordRoutes from './routes/dnsRecords.js'
import domainRoutes from './routes/domains.js'
import notificationChannelRoutes from './routes/notificationChannels.js'
import providerRoutes from './routes/providers.js'
import renewalLogRoutes from './routes/renewalLogs.js'
import { startAutoRenewalScheduler } from './services/autoRenew.js'

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())

// 请求日志中间件
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString()
  const method = req.method
  const url = req.url
  console.log(`[${timestamp}] ${method} ${url}`)
  next()
})

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/providers', providerRoutes)
app.use('/api/domains', domainRoutes)
app.use('/api/notification-channels', notificationChannelRoutes)
app.use('/api/dns-records', dnsRecordRoutes)
app.use('/api/renewal-logs', renewalLogRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 错误处理
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({ error: '服务器内部错误' })
})

// 启动服务器
async function start() {
  try {
    // 初始化数据库
    await initDatabase()

    // 启动自动续期定时任务（默认每天凌晨2点）
    const cronExpression = process.env.RENEWAL_CRON_EXPRESSION || '0 2 * * *'
    startAutoRenewalScheduler(cronExpression)

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`)
    })
  }
  catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
