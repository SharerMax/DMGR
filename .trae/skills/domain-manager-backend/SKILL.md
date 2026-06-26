---
name: "domain-manager-backend"
description: "Backend development for Domain Manager Express server. Invoke when working on API routes, models, DNS providers, services, or database schema in packages/server."
---

# Domain Manager Backend

Express 5 + Prisma + SQLite + JWT + Zod 4 + Pino

## 目录结构

```
packages/server/src/
├── index.ts             # 服务器入口（路由注册、中间件）
├── db/index.ts          # Prisma Client 初始化
├── prisma/
│   ├── schema.prisma    # 数据模型（注意路径是 src/prisma/）
│   ├── seed.ts          # 种子数据
│   ├── generated/       # Prisma Client 输出
│   └── migrations/
├── middleware/
│   ├── auth.ts          # JWT_SECRET + authMiddleware + verifyToken
│   └── index.ts
├── models/              # 数据访问层（CRUD 封装）
├── routes/              # API 路由（控制器层）
│   ├── auth.ts          # /api/auth
│   ├── domains.ts       # /api/domains
│   ├── providers.ts     # /api/providers
│   ├── notificationChannels.ts  # /api/notification-channels
│   ├── dnsRecords.ts    # /api/dns-records
│   └── renewalLogs.ts   # /api/renewal-logs
├── services/            # 业务服务层
│   ├── autoRenew.ts     # 自动续期服务
│   └── notification.ts  # 通知服务
├── providers/           # DNS 服务商适配层（按服务商拆分目录）
│   ├── index.ts         # 统一导出
│   ├── base.ts          # 抽象基类
│   ├── config.ts        # 内置服务商配置
│   └── aliyun/          # 阿里云目录
│       ├── index.ts
│       ├── provider.ts  # DNS Provider 实现
│       └── syncer.ts    # 域名同步实现
└── utils/               # 工具函数
    ├── index.ts
    ├── logger.ts        # Pino logger 配置
    ├── requestLogger.ts # 请求日志中间件
    └── response.ts      # 统一 API 响应格式
```

## 分层架构

| 层 | 目录 | 职责 |
|----|------|------|
| 控制器层 | `routes/` | 接收请求、参数校验、调用服务/模型、返回响应 |
| 业务层 | `services/` | 业务逻辑，调用数据访问层和适配层 |
| 适配/集成层 | `providers/` | 与第三方 DNS 服务商交互 |
| 数据访问层 | `models/` | 数据库 CRUD 封装 |

## 数据模型关系

```
User ─┬─> Provider ──> Domain
      ├─> Domain ─┬─> Reminder
      │           ├─> DNSRecord
      │           ├─> RenewalLog
      │           └─> NotificationLog
      ├─> NotificationChannel
      └─> NotificationLog
```

关键字段:
- Domain: `autoRenew`, `autoRenewDays`, `expiryDate`, `status`
- Provider: `config` (JSON string), `supportsAutoRenew`
- NotificationChannel: `config` (JSON string), `defaultDays`, `isActive`

## 统一 API 响应格式

所有接口返回 `{ code, message, data }` 格式，由 `utils/response.ts` 提供工具函数：

```typescript
import { sendSuccess, sendError, HTTP_STATUS } from '../utils/response.js'
import { logger } from '../utils/index.js'

// 成功响应
sendSuccess(res, data, '操作成功')

// 错误响应
sendError(res, '错误消息', 1, HTTP_STATUS.BAD_REQUEST)
```

- `code === 0` 表示成功
- 前端 Axios 拦截器自动提取 `data` 字段

## 日志系统

使用 Pino logger，**禁止使用 console.log/error/warn**：

```typescript
import { logger } from '../utils/index.js'

logger.info({ userId, action }, 'User logged in')
logger.error({ error }, 'Operation failed')
logger.warn({ domain }, 'Domain expiring soon')
```

请求日志由 `requestLogger` 中间件自动记录（包含 method、path、status、duration）。

## 路由开发

1. 在 `routes/` 创建路由文件
2. 用 Zod 验证输入，`authMiddleware` 保护路由
3. 使用 `sendSuccess/sendError` 统一响应
4. 使用 `logger` 记录日志（禁止 console.*）
5. 在 `index.ts` 注册: `app.use('/api/xxx', xxxRoutes)`
6. 导入用 `.js` 扩展名: `import { prisma } from '../db/index.js'`

## 认证中间件

`middleware/auth.ts` 统一管理：

```typescript
import { authMiddleware, AuthRequest } from '../middleware/index.js'

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!
  // ...
})
```

- JWT Bearer token，有效期 7 天
- `authMiddleware` 验证后挂载 `req.userId`
- 用户只能访问自己的数据（查询必须包含 userId 过滤）
- 登录支持用户名或邮箱（自动识别 `@` 符号）

## DNS Provider 系统

按服务商拆分目录结构，每个服务商目录下只放服务商相关代码：

服务商类型: aliyun, tencent, cloudflare, dnspod, namecheap, custom

每个 Provider 实现:
- `getDNSRecords(domain)` / `addDNSRecord(domain, record)`
- `updateDNSRecord(domain, recordId, record)` / `deleteDNSRecord(domain, recordId)`
- 域名同步器 `Syncer` 类

添加新 Provider:
1. 在 `providers/<name>/` 创建目录
2. 实现 `provider.ts`（继承 `BaseDNSProvider`）
3. 实现 `syncer.ts`（实现 `DomainSyncer` 接口）
4. 创建 `index.ts` 导出
5. 在 `providers/config.ts` 添加配置
6. 在 `providers/index.ts` 统一导出
