# 后端开发规范

> 适用于 `packages/server/` 下的所有代码。核心技术栈：Express.js 5.2 + TypeScript + Zod 4.4 + Pino 10.3 + Prisma + SQLite。

---

## 1. 核心技术栈速查

| 类别 | 库 | 说明 |
|------|-----|------|
| 框架 | Express.js 5.2.x | Web 服务器 |
| 数据库 | Prisma + SQLite | ORM + 轻量数据库 |
| 数据校验 | Zod 4.4.x | 类型安全的 schema 校验 |
| 日志 | Pino 10.3.x | 结构化日志 |
| 认证 | JWT (jsonwebtoken + bcryptjs) | Token 鉴权 |
| 定时任务 | node-cron | 域名自动续期调度 |
| 语言 | TypeScript 6.x | 全量类型检查 |
| CORS | cors | 前端跨域请求处理 |

---

## 2. 分层架构（强制执行）

### 2.1 目录结构

```
packages/server/src/
├── db/                      # Prisma Client 初始化
│   └── index.ts
├── middleware/              # Express 中间件
│   ├── auth.ts              # JWT 鉴权中间件
│   └── index.ts             # 聚合导出
├── models/                  # 纯 CRUD 层（无业务逻辑）
│   ├── user.ts
│   ├── provider.ts
│   ├── domain.ts
│   ├── dnsRecord.ts
│   ├── notificationChannel.ts
│   ├── renewalLog.ts
│   └── syncLog.ts
├── prisma/                  # Prisma schema + seed + migrations
│   ├── schema.prisma
│   ├── seed.ts
│   └── cleanup.ts
├── providers/               # 第三方服务商适配层
│   ├── base.ts              # DNSProvider / DomainSyncer / DomainRenewer 抽象基类
│   ├── config.ts            # 内建服务商配置 + ProviderFeatures
│   ├── aliyun/              # 阿里云
│   │   ├── apiClient.ts     # 官方 SDK 封装
│   │   ├── provider.ts      # DNSProvider 实现
│   │   ├── syncer.ts        # DomainSyncer 实现
│   │   ├── renewer.ts       # DomainRenewer 实现
│   │   └── index.ts         # 注册到工厂
│   ├── tencent/             # 腾讯云
│   ├── cloudflare/          # Cloudflare
│   ├── dnspod/              # DNSPod
│   ├── namecheap/           # Namecheap
│   ├── vps8/                # VPS8
│   ├── gleam/               # Gleam (HL6 API，apiKey 鉴权)
│   └── index.ts             # DNSProviderFactory + 聚合导出
├── routes/                  # 控制器层（路由 + 参数校验 + 调用 service）
│   ├── auth.ts
│   ├── providers.ts
│   ├── domains.ts
│   ├── dnsRecords.ts
│   ├── notificationChannels.ts
│   ├── renewalLogs.ts
│   └── syncLogs.ts
├── services/                # 业务服务层
│   ├── autoRenewService.ts  # 自动续期调度
│   ├── providerService.ts   # 服务商业务逻辑（含同步写 SyncLog）
│   ├── domainService.ts     # 域名业务逻辑
│   ├── dnsRecordService.ts  # DNS 记录业务逻辑
│   ├── notificationChannelService.ts
│   ├── renewalLogService.ts
│   ├── syncLogService.ts    # 同步日志业务层
│   ├── userService.ts
│   └── notificationService.ts
├── utils/                   # 工具函数
│   ├── logger.ts
│   ├── requestLogger.ts
│   ├── response.ts          # sendSuccess / sendError + HTTP_STATUS
│   └── index.ts
└── index.ts                 # 服务器入口
```

### 2.2 各层职责（单向调用，禁止跨层）

| 层 | 允许做 | 禁止做 |
|----|--------|--------|
| `routes/`（控制器） | 定义路由、参数校验（Zod）、应用鉴权中间件、调用 service、用 `sendSuccess/sendError` 返回统一响应、记录请求日志 | 直接调用 `models/` 或 `prisma.*`、直接调用三方 API、写业务判断 |
| `services/`（业务层） | 业务逻辑实现、权限校验（`userId` 过滤）、多表协调、事务、调用 `models/` 或 `providers/*/` | 直接构造 HTTP 响应、直接操作 prisma（必须走 models） |
| `providers/<name>/`（适配器） | 封装官方 SDK / HTTP 请求、解析业务响应、暴露领域方法 | 访问数据库、写业务判断、直接调用 prisma |
| `models/`（数据层） | 纯 CRUD（`get` / `listByUserId` / `create` / `update` / `delete` 等）、按用户过滤 | 包含业务逻辑、鉴权、调用三方 API |

---

## 3. ES Module 导入规范

- **所有 `import` 语句必须带 `.js` 扩展名**（TypeScript 编译为 ESM，Node.js 要求明确扩展名）
- 使用绝对路径别名 `@/` 从 `src/` 根目录引用

```typescript
// ✅ 正确
import { logger } from '@/utils/index.js'
import { sendSuccess, HTTP_STATUS } from '@/utils/response.js'
import { authMiddleware } from '@/middleware/index.js'
import { createUser } from '@/models/user.js'

// ❌ 错误
import { logger } from './utils'              // 缺少 .js
import { sendSuccess } from '@/utils/response' // 缺少 .js
import createUser from '../models/user.ts'     // 不要用 .ts
```

---

## 4. 参数校验（Zod）

所有 POST / PUT / PATCH 请求的参数**必须**在 `routes/` 层用 Zod schema 校验。

### 4.1 标准 Zod 模板

```typescript
import { z } from 'zod'
import { sendError, HTTP_STATUS } from '@/utils/response.js'

const createDomainSchema = z.object({
  name: z.string().min(1, '域名不能为空').max(255, '域名过长'),
  providerId: z.coerce.number().int().positive('providerId 必须是正整数').nullable().optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  renewalPrice: z.coerce.number().nonnegative().nullable().optional(),
  notes: z.string().max(1000, '备注最多 1000 个字符').nullable().optional(),
  autoRenew: z.coerce.boolean().default(false),
  autoRenewDays: z.coerce.number().int().positive().nullable().optional(),
})

// 使用方式
export const createDomain = async (req: AuthenticatedRequest, res: Response) => {
  const parse = createDomainSchema.safeParse(req.body)
  if (!parse.success) {
    const messages = parse.error.issues.map((i) => i.message).join('; ')
    sendError(res, messages, 1, HTTP_STATUS.BAD_REQUEST)
    return
  }
  const payload = parse.data

  try {
    const domain = await domainService.createDomain(req.user.userId, payload)
    sendSuccess(res, domain, '域名创建成功', HTTP_STATUS.CREATED)
  } catch (error: any) {
    logger.error({ error }, 'Failed to create domain')
    sendError(res, error.message || '创建失败', 1, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
}
```

### 4.2 Zod 常用验证器速查

| 场景 | Zod |
|------|-----|
| 非空字符串 | `z.string().min(1, 'xxx不能为空')` |
| 邮箱 | `z.string().email('邮箱格式不正确')` |
| 正整数 | `z.coerce.number().int().positive('xxx必须为正整数')` |
| 可选字段 | `.nullable().optional()` 或 `.optional()` |
| 默认值 | `.default(false)` / `.default(30)` |
| 日期 | `z.coerce.date()` |
| 布尔值 | `z.coerce.boolean()` |
| 数字数组 | `z.array(z.coerce.number().int().positive())` |
| JSON 字符串 | `z.string().transform((s, ctx) => { try { return JSON.parse(s) } catch { ctx.addIssue(...) return z.NEVER } })` |
| 配置字段（对象） | `z.record(z.string(), z.string())` |

---

## 5. JWT 鉴权中间件

### 5.1 受保护的路由

所有需要登录的路由**必须**应用 `authMiddleware`：

```typescript
import { Router } from 'express'
import { authMiddleware } from '@/middleware/index.js'

const router = Router()

// 受保护的路由
router.use(authMiddleware)  // 应用到后续所有路由
router.get('/domains', listDomains)
router.post('/domains', createDomain)

// 也可以单独应用
router.get('/public', handlePublic)
router.post('/protected', authMiddleware, handleProtected)
```

### 5.2 AuthenticatedRequest 类型

```typescript
// middleware/auth.ts 中定义
export interface AuthenticatedRequest extends Request {
  user?: { userId: number; username: string; email?: string }
}
```

业务层必须使用 `req.user.userId` 过滤数据，**用户只能访问自己的数据**。

---

## 6. 数据层（models/*）规范

每个 model 文件按以下结构组织：

```typescript
import prisma from '@/db/index.js'

export async function getById(id: number, userId: number) {
  return prisma.domain.findFirstOrThrow({
    where: { id, userId },
    include: { provider: true, dnsRecords: true },
  })
}

export async function listByUserId(userId: number) {
  return prisma.domain.findMany({
    where: { userId },
    include: { provider: true, dnsRecords: true },
    orderBy: { createdAt: 'desc' as const },
  })
}

export async function create(userId: number, data: any) {
  return prisma.domain.create({
    data: { ...data, userId },
  })
}

export async function update(id: number, userId: number, data: any) {
  return prisma.domain.updateMany({
    where: { id, userId },
    data,
  })
}

export async function remove(id: number, userId: number) {
  return prisma.domain.deleteMany({
    where: { id, userId },
  })
}
```

**要点**：
- 所有查询/更新/删除必须包含 `userId` 过滤（使用 `findFirst`/`updateMany`/`deleteMany` 而非 `findUnique`/`update`/`delete`）
- 关联查询在 model 层使用 `include` 预先拉取，避免 N+1 查询
- 返回 `findFirstOrThrow` 让上层可以捕获未找到的情况

---

## 7. 数据库操作规范

### 7.1 Schema 修改流程

```bash
cd packages/server
pnpm prisma migrate dev --name <描述性名称>   # 生成并应用迁移
pnpm prisma generate                           # 重新生成 Prisma Client TypeScript 类型
```

### 7.2 清理脏数据

```bash
pnpm tsx src/prisma/cleanup.ts
```

### 7.3 数据库模型速查

| 模型 | 关键字段 | 说明 |
|------|---------|------|
| `User` | `id`、`username`、`password`（bcrypt 哈希）、`email?` | 用户账号 |
| `Provider` | `id`、`type`、`name`、`config`（JSON 字符串）、`supportsAutoRenew`、`features`（JSON）、`userId` | 服务商配置 |
| `Domain` | `id`、`name`、`providerId?`、`expiryDate?`、`renewalPrice?`、`notes?`、`autoRenew`、`autoRenewDays?`、`status`、`userId` | 域名 |
| `DNSRecord` | `id`、`domainId`、`type`、`name`、`value`、`ttl`、`priority?` | DNS 记录 |
| `NotificationChannel` | `id`、`type`、`name`、`config`（JSON 字符串）、`defaultDays`、`isActive`、`userId` | 通知渠道 |
| `RenewalLog` | `id`、`domainId`、`status`、`message?`、`error?`、`renewedAt?`、`createdAt` | 续期日志 |
| `Reminder` | `id`、`domainId`、`daysBefore`、`notified`、`notifyDate?`、`createdAt` | 提醒记录 |
| `NotificationLog` | `id`、`userId`、`domainId?`、`type`、`content`、`channel`、`sentAt` | 通知发送日志 |
| `SyncLog` | `id`、`providerId`、`userId`、`status`（success/failed/partial）、`domainsSynced`、`dnsInserted`、`dnsDeleted`、`error?`、`details?`（JSON 字符串，含具体变更域名/DNS 记录）、`createdAt` | 服务商域名同步审计日志 |

**级联关系**：
- `Provider → Domain`：手动级联（删除服务商时由 `deleteUserProvider` 显式删除关联域名），DB 层为 `SetNull`
- `Domain → DNSRecord / Reminder / RenewalLog`：DB 层 `onDelete: Cascade`

---

## 8. ProviderFeatures 能力声明系统

每个服务商通过 `providers/config.ts` 的 `BUILT_IN_PROVIDERS` 配置声明其能力：

```typescript
interface ProviderFeatures {
  domainSync: boolean     // 支持域名同步
  dnsManagement: boolean  // 支持 DNS 记录管理
  autoRenew: boolean      // 支持自动续期
}
```

**内建服务商能力矩阵**：

| 服务商 | `domainSync` | `dnsManagement` | `autoRenew` |
|--------|-------------|-----------------|-------------|
| `aliyun` | ✅ | ✅ | ✅ |
| `tencent` | ✅ | ✅ | ✅ |
| `cloudflare` | ✅ | ✅ | ❌ |
| `dnspod` | ✅ | ✅ | ❌ |
| `namecheap` | ✅ | ✅ | ✅ |
| `vps8` | ✅ | ✅ | ❌ |
| `gleam` | ✅ | ✅ | ❌ |

**service 层执行操作前必须校验对应能力**：

```typescript
const provider = await getProviderById(providerId, userId)
const builtin = BUILT_IN_PROVIDERS[provider.type]
if (!builtin?.features.domainSync) {
  throw new Error('该服务商不支持域名同步')
}
```

### 8.1 DNSProviderFactory

统一通过工厂创建服务商实例：

```typescript
import { DNSProviderFactory } from '@/providers/index.js'

const dns = DNSProviderFactory.createProvider('aliyun', { accessKeyId, accessKeySecret })
const syncer = DNSProviderFactory.createSyncer('aliyun', { accessKeyId, accessKeySecret })
const renewer = DNSProviderFactory.createRenewer('aliyun', { accessKeyId, accessKeySecret })
```

---

## 9. 统一响应格式

所有接口必须使用 `utils/response.ts` 的工具函数返回统一格式：

```typescript
// ✅ 正确
sendSuccess(res, data)                                    // 200 OK
sendSuccess(res, data, '操作成功', HTTP_STATUS.CREATED)  // 201 Created
sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)    // 400 Bad Request
sendError(res, '未授权', 1, HTTP_STATUS.UNAUTHORIZED)     // 401 Unauthorized
sendError(res, '资源不存在', 1, HTTP_STATUS.NOT_FOUND)    // 404 Not Found
sendError(res, '服务器内部错误', 1, HTTP_STATUS.INTERNAL_SERVER_ERROR) // 500
```

**响应格式**（前端 Axios 拦截器依赖此格式）：

```typescript
{ code: number, message: string, data?: any }
// code === 0 表示成功
// code !== 0 表示失败，message 为用户可读的错误信息
```

---

## 10. 日志规范

- **绝对禁止 `console.log` / `console.error` / `console.warn`**
- 统一使用 Pino logger（从 `@/utils/index.js` 导入）

```typescript
import { logger } from '@/utils/index.js'

logger.info({ userId, domain: data.name }, 'Domain created')
logger.warn({ providerId }, 'Provider credential validation failed')
logger.error({ error, providerId }, 'Failed to sync domains')
```

**日志查看**：后端 stdout 输出 Pino 结构化日志，可通过 `pnpm dev:server | pnpm pino-pretty` 以人类可读格式查看。

**同步审计日志（SyncLog）**：除 Pino 运行时日志外，服务商域名同步操作还会写入 `SyncLog` 表用于持久化审计。`providerService.syncProviderDomains` 在每次同步完成后记录 `status`（success/failed/partial）、计数（`domainsSynced` / `dnsInserted` / `dnsDeleted`）以及 `details`（JSON 字符串，含具体变更的域名与 DNS 记录）。前端通过 `/api/sync-logs` 接口查询历史同步记录。

---

## 11. 环境变量

在 `packages/server/` 下创建 `.env` 文件（.gitignore 已排除）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 后端端口 |
| `JWT_SECRET` | `dev-secret-change-me` | JWT 签名密钥（生产必须修改） |
| `RENEWAL_CRON_EXPRESSION` | `0 2 * * *` | 自动续期 cron 表达式 |
| `LOG_LEVEL` | `info` | Pino 日志级别（`debug` / `info` / `warn` / `error`） |
| `DATABASE_URL` | `file:./dev.db` | SQLite 文件路径 |

---

## 12. 快速反模式检查清单

提交前对照检查：

- ✅ 所有 `import` 语句带 `.js` 扩展名
- ✅ 使用 `@/` 别名引用 `src/` 目录
- ✅ 所有 POST/PUT 路由使用 Zod schema 校验参数
- ✅ 使用 `sendSuccess` / `sendError` 返回统一响应格式
- ✅ 使用 `HTTP_STATUS` 常量而非硬编码数字
- ✅ 没有 `console.log` / `console.error`
- ✅ 使用 `logger.info/warn/error` 记录日志
- ✅ 所有查询包含 `userId` 过滤（用户数据隔离）
- ✅ `routes/` 层不直接调用 `prisma.*`（走 service → model）
- ✅ `services/` 层不直接调用 `prisma.*`（走 model）
- ✅ `providers/` 层不访问数据库
- ✅ 删除服务商/域名等危险操作通过 service 层协调处理级联
- ✅ ProviderFeatures 在执行操作前做了能力校验
- ✅ Provider 的 `config` 字段在 service 层做了解析和验证
