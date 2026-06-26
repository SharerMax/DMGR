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
├── routes/              # API 路由（控制器层，只调用 services）
│   ├── auth.ts          # /api/auth
│   ├── domains.ts       # /api/domains
│   ├── providers.ts     # /api/providers
│   ├── notificationChannels.ts  # /api/notification-channels
│   ├── dnsRecords.ts    # /api/dns-records
│   └── renewalLogs.ts   # /api/renewal-logs
├── services/            # 业务服务层（控制器只调用这一层）
│   ├── userService.ts   # 用户业务（注册/登录/资料/密码）
│   ├── domainService.ts # 域名业务（CRUD/过滤/提醒/级联删除）
│   ├── providerService.ts  # 服务商业务（CRUD/配置校验/域名同步）
│   ├── dnsRecordService.ts # DNS 记录业务（CRUD/权限校验）
│   ├── notificationChannelService.ts # 通知渠道业务
│   ├── renewalLogService.ts  # 续期日志业务（查询/统计/自动续期配置）
│   ├── autoRenew.ts     # 自动续期调度服务
│   └── notification.ts  # 通知发送服务
├── models/              # 数据访问层（纯 CRUD，不包含业务逻辑）
│   ├── user.ts
│   ├── domain.ts
│   ├── provider.ts
│   ├── dnsRecord.ts
│   ├── reminder.ts
│   ├── notificationChannel.ts
│   └── renewalLog.ts
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

| 层 | 目录 | 职责 | 禁止 |
|----|------|------|------|
| 控制器层 | `routes/` | 接收请求、参数校验（Zod）、调用 service、返回统一响应、记录日志 | 直接调用 models/ 或 prisma |
| 业务层 | `services/` | 业务逻辑、权限校验、多表协调、调用 models/ 和 providers/ | 直接处理 HTTP 响应 |
| 适配/集成层 | `providers/` | 与第三方 DNS 服务商交互 | 访问数据库 |
| 数据访问层 | `models/` | 纯 CRUD 封装，无业务逻辑 | 包含业务逻辑 |

调用链: `routes → services → models → db/prisma`

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

**重要：路由层只能调用 services/，禁止直接导入 models/ 或 prisma。**

1. 在 `routes/` 创建路由文件
2. 用 Zod 验证输入，`authMiddleware` 保护路由
3. 调用对应的 `xxxService` 方法执行业务逻辑
4. 使用 `sendSuccess/sendError` 统一响应
5. 使用 `logger` 记录日志（禁止 console.*）
6. 在 `index.ts` 注册: `app.use('/api/xxx', xxxRoutes)`
7. 导入用 `.js` 扩展名

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, type AuthRequest } from '../middleware/index.js'
import { getUserDomains, createUserDomain } from '../services/domainService.js'
import { sendSuccess, sendError, HTTP_STATUS } from '../utils/response.js'
import { logger } from '../utils/index.js'

const router = Router()

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const domains = await getUserDomains(req.userId!)
    return sendSuccess(res, domains)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Get domains error')
    return sendError(res, '获取失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
```

## 业务服务层开发

每个领域实体对应一个 `xxxService.ts`，方法命名体现业务语义：

```typescript
// services/domainService.ts
export async function getUserDomains(userId, filters?) { ... }
export async function getDomainWithReminders(userId, domainId) { ... }
export async function createUserDomain(userId, input) { ... }
export async function updateUserDomain(userId, domainId, input) { ... }
export async function deleteUserDomain(userId, domainId) { ... }
```

约定:
- 涉及用户数据的方法以 `getUserXxx`/`createUserXxx` 等命名
- service 层抛出 Error，由路由层 catch 后转换为 HTTP 响应
- service 层调用 models/ 做数据访问，调用 providers/ 做第三方集成

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
