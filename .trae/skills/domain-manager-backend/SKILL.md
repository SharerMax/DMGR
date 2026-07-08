# Domain Manager 后端开发 Skill

> 面向 AI Agent 的后端开发速查指南。当你需要修改 `packages/server/` 下的代码时，先阅读本文件。

---

## 1. 快速开始：你的第一个后端改动

假设你需要添加一个新的 API 端点（如 `GET /api/domains/:id/details`），按以下步骤执行：

1. **定义数据层** — 在 `models/domain.ts` 中添加查询函数
2. **实现业务逻辑** — 在 `services/domainService.ts` 中实现业务处理
3. **定义路由处理器** — 在 `routes/domains.ts` 中添加 handler
4. **挂载路由** — 在 `routes/domains.ts` 的 router 中添加 `router.get('/:id/details', ...)`
5. **质量保证** — `pnpm lint` → `pnpm typecheck` → `pnpm build:server`

---

## 2. 目录结构与职责

```
packages/server/src/
├── db/                      # Prisma Client 初始化
│   └── index.ts
├── middleware/              # Express 中间件
│   ├── auth.ts              # JWT 鉴权
│   └── index.ts             # 聚合导出
├── models/                  # 纯 CRUD 层（无业务逻辑）
│   ├── user.ts
│   ├── provider.ts
│   ├── domain.ts
│   ├── dnsRecord.ts
│   ├── notificationChannel.ts
│   └── renewalLog.ts
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
│   └── index.ts             # DNSProviderFactory + 聚合导出
├── routes/                  # 控制器层
│   ├── auth.ts
│   ├── providers.ts
│   ├── domains.ts
│   ├── dnsRecords.ts
│   ├── notificationChannels.ts
│   └── renewalLogs.ts
├── services/                # 业务服务层
│   ├── autoRenewService.ts  # 自动续期调度
│   ├── providerService.ts   # 服务商业务逻辑
│   ├── domainService.ts     # 域名业务逻辑
│   ├── dnsRecordService.ts  # DNS 记录业务逻辑
│   ├── notificationChannelService.ts
│   ├── renewalLogService.ts
│   ├── userService.ts
│   └── notificationService.ts
├── utils/                   # 工具函数
│   ├── logger.ts
│   ├── requestLogger.ts
│   ├── response.ts          # sendSuccess / sendError + HTTP_STATUS
│   └── index.ts
└── index.ts                 # 服务器入口（路由注册 + 中间件 + 启动）
```

---

## 3. 分层调用模式（严格遵守）

### 3.1 单向调用链

```
routes/ (控制器)   → 只调用 services/
services/ (业务层) → 调用 models/ + providers/*/
models/ (数据层)   → 只调用 Prisma
providers/<name>/  → 只调用官方 SDK / HTTP API，不访问数据库
```

**禁止的跨层调用**：
- ❌ `routes/` 直接调用 `prisma.*`
- ❌ `services/` 直接调用 `prisma.*`（必须走 model 函数）
- ❌ `providers/` 访问数据库
- ❌ 任何层直接构造 HTTP 响应（`res.json(...)`），必须使用 `sendSuccess`/`sendError`

### 3.2 添加一个新的 CRUD 端点（模板）

#### Step 1: Model 层（`models/domain.ts`）

```typescript
import prisma from '@/db/index.js'

export async function getDetails(id: number, userId: number) {
  return prisma.domain.findFirstOrThrow({
    where: { id, userId },
    include: {
      provider: true,
      dnsRecords: true,
      renewalLogs: { orderBy: { createdAt: 'desc' as const }, take: 5 },
    },
  })
}
```

#### Step 2: Service 层（`services/domainService.ts`）

```typescript
import { logger } from '@/utils/index.js'
import { getDetails } from '../models/domain.js'

export async function getDomainDetails(userId: number, domainId: number) {
  logger.info({ userId, domainId }, 'Getting domain details')
  const domain = await getDetails(domainId, userId)
  // 这里可以补充业务逻辑（如计算过期天数、格式化数据等）
  return domain
}
```

#### Step 3: Route 层（`routes/domains.ts`）

```typescript
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { sendError, sendSuccess, HTTP_STATUS } from '@/utils/response.js'
import { logger } from '@/utils/index.js'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/index.js'
import { getDomainDetails } from '../services/domainService.js'

const router = Router()
router.use(authMiddleware)

// 参数校验 schema
const getDomainDetailsParamsSchema = z.object({
  id: z.coerce.number().int().positive('id 必须是正整数'),
})

export const handleGetDomainDetails = async (req: AuthenticatedRequest, res: Response) => {
  const parse = getDomainDetailsParamsSchema.safeParse(req.params)
  if (!parse.success) {
    const messages = parse.error.issues.map((i) => i.message).join('; ')
    sendError(res, messages, 1, HTTP_STATUS.BAD_REQUEST)
    return
  }
  const { id } = parse.data

  try {
    const domain = await getDomainDetails(req.user!.userId, id)
    sendSuccess(res, domain)
  } catch (error: any) {
    logger.error({ error, domainId: id }, 'Failed to get domain details')
    sendError(res, error.message || '获取失败', 1, HTTP_STATUS.NOT_FOUND)
  }
}

// 挂载路由
router.get('/:id/details', handleGetDomainDetails)

export default router
```

---

## 4. ProviderFeatures 能力系统

### 4.1 能力声明（`providers/config.ts`）

每个服务商通过 `BUILT_IN_PROVIDERS` 配置声明其能力：

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

### 4.2 service 层能力校验模板

```typescript
import { BUILT_IN_PROVIDERS } from '../providers/config.js'

// 示例：同步域名前检查能力
const provider = await getProviderById(providerId, userId)
const builtin = BUILT_IN_PROVIDERS[provider.type]
if (!builtin?.features.domainSync) {
  throw new Error(`该服务商（${provider.name}）不支持域名同步`)
}

// 示例：DNS 管理前检查能力
if (!builtin?.features.dnsManagement) {
  throw new Error(`该服务商（${provider.name}）不支持 DNS 记录管理`)
}

// 示例：自动续期前检查能力
if (!builtin?.features.autoRenew) {
  throw new Error(`该服务商（${provider.name}）不支持自动续期`)
}
```

### 4.3 通过工厂创建实例

```typescript
import { DNSProviderFactory } from '@/providers/index.js'

// 解析 provider.config（JSON 字符串）
const config = JSON.parse(provider.config)

// 创建对应能力的实例
const dns = DNSProviderFactory.createProvider(provider.type, config)
const syncer = DNSProviderFactory.createSyncer(provider.type, config)
const renewer = DNSProviderFactory.createRenewer(provider.type, config)
```

---

## 5. 关键导入规范

### 5.1 必须带 `.js` 扩展名

```typescript
// ✅ 正确
import { logger } from '@/utils/index.js'
import { sendSuccess, sendError, HTTP_STATUS } from '@/utils/response.js'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/index.js'
import { createUser, getUserByUsername } from '@/models/user.js'
import { DNSProviderFactory } from '@/providers/index.js'

// ❌ 错误 — 缺少 .js 扩展名
import { logger } from '@/utils/index'
import { createUser } from '../models/user'
```

### 5.2 使用 `@/` 别名引用 `src/`

相对路径仅限同一模块内部使用，跨模块引用使用 `@/` 别名。

---

## 6. 统一响应格式

所有接口**必须**返回以下格式：

```typescript
{ code: number, message: string, data?: any }
// code === 0 表示成功
// code !== 0 表示失败
```

### 6.1 sendSuccess / sendError 模板

```typescript
import { sendSuccess, sendError, HTTP_STATUS } from '@/utils/response.js'

// 200 OK（最常用）
sendSuccess(res, data)

// 201 Created
sendSuccess(res, data, '创建成功', HTTP_STATUS.CREATED)

// 204 No Content（用于删除等无返回内容的操作）
sendSuccess(res, undefined, '删除成功', HTTP_STATUS.NO_CONTENT)

// 400 Bad Request（参数校验失败）
sendError(res, '参数错误: 名称不能为空', 1, HTTP_STATUS.BAD_REQUEST)

// 401 Unauthorized
sendError(res, '未授权', 1, HTTP_STATUS.UNAUTHORIZED)

// 403 Forbidden
sendError(res, '无权限执行此操作', 1, HTTP_STATUS.FORBIDDEN)

// 404 Not Found
sendError(res, '资源不存在', 1, HTTP_STATUS.NOT_FOUND)

// 500 Internal Server Error
sendError(res, '服务器内部错误', 1, HTTP_STATUS.INTERNAL_SERVER_ERROR)
```

---

## 7. Zod 参数校验模式

### 7.1 POST 请求主体校验

```typescript
import { z } from 'zod'

const createDomainSchema = z.object({
  name: z.string().min(1, '域名不能为空').max(255, '域名过长'),
  providerId: z.coerce.number().int().positive().nullable().optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  renewalPrice: z.coerce.number().nonnegative().nullable().optional(),
  notes: z.string().max(1000, '备注最多 1000 个字符').nullable().optional(),
  autoRenew: z.coerce.boolean().default(false),
  autoRenewDays: z.coerce.number().int().positive().nullable().optional(),
})

// 在 handler 中使用
const parse = createDomainSchema.safeParse(req.body)
if (!parse.success) {
  const messages = parse.error.issues.map((i) => i.message).join('; ')
  sendError(res, messages, 1, HTTP_STATUS.BAD_REQUEST)
  return
}
const payload = parse.data  // payload 的类型由 Zod 推断
```

### 7.2 动态字段校验（Provider config）

```typescript
import { z } from 'zod'
import { BUILT_IN_PROVIDERS } from '@/providers/config.js'

// 根据 provider.type 获取必填字段列表
const builtin = BUILT_IN_PROVIDERS[req.body.type]
if (!builtin) {
  sendError(res, `不支持的服务商类型: ${req.body.type}`, 1, HTTP_STATUS.BAD_REQUEST)
  return
}

// 动态构建 config 字段的 Zod schema
const configShape: Record<string, z.ZodString> = {}
for (const field of builtin.fields) {
  if (field.required) {
    configShape[field.key] = z.string().min(1, `${field.label}必填`)
  } else {
    configShape[field.key] = z.string().optional()
  }
}

const createProviderSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  type: z.string().min(1, '请选择服务商类型'),
  config: z.object(configShape),
})
```

---

## 8. 用户数据隔离（JWT + userId）

### 8.1 AuthenticatedRequest 类型

```typescript
// middleware/auth.ts
export interface AuthenticatedRequest extends Request {
  user?: { userId: number; username: string; email?: string }
}
```

### 8.2 所有查询必须包含 userId 过滤

```typescript
// ✅ 正确 — 使用 findFirst / updateMany / deleteMany + userId
export async function getById(id: number, userId: number) {
  return prisma.domain.findFirstOrThrow({
    where: { id, userId },
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

// ❌ 错误 — 直接使用 findUnique / update / delete，无法按用户过滤
export async function getById(id: number) {
  return prisma.domain.findUnique({ where: { id } })  // 绕过用户隔离！
}
```

---

## 9. 删除操作与级联处理

### 9.1 删除 Provider（手动级联）

删除服务商时，其下所有域名也应一并删除。这在 `services/providerService.ts` 中处理：

```typescript
// 使用事务确保原子性
await prisma.$transaction(async (tx) => {
  // 1. 删除该 provider 下的所有域名（会自动级联删除 DNSRecord / Reminder / RenewalLog）
  await tx.domain.deleteMany({ where: { providerId, userId } })
  // 2. 删除 provider
  await tx.provider.deleteMany({ where: { id: providerId, userId } })
})
```

### 9.2 删除 Domain（DB 层自动级联）

`Domain → DNSRecord / Reminder / RenewalLog` 在 Prisma schema 中设置为 `onDelete: Cascade`，删除域名时自动清理。

---

## 10. 数据库操作模板

### 10.1 添加新字段后迁移

```bash
cd packages/server

# 1. 修改 schema.prisma
# 2. 创建迁移
pnpm prisma migrate dev --name add_notes_field_to_domain

# 3. 重新生成 Prisma Client
pnpm prisma generate
```

### 10.2 清理脏数据

```bash
pnpm tsx src/prisma/cleanup.ts
```

### 10.3 Prisma 查询模式速查

```typescript
// 条件查询（可选过滤）
const where: Record<string, any> = { userId }
if (providerId) where.providerId = providerId
if (status) where.status = status

const domains = await prisma.domain.findMany({
  where,
  include: { provider: true },
  orderBy: { createdAt: 'desc' as const },
})

// 分页查询
const domains = await prisma.domain.findMany({
  where: { userId },
  skip: (page - 1) * pageSize,
  take: pageSize,
  orderBy: { createdAt: 'desc' as const },
})

// 统计
const total = await prisma.domain.count({ where: { userId } })
```

---

## 11. 日志规范

### 11.1 禁止使用 console.log

```typescript
// ✅ 正确
import { logger } from '@/utils/index.js'

logger.info({ userId, providerId }, 'Syncing domains')
logger.warn({ domain }, 'Domain expiring soon')
logger.error({ error, domainId }, 'Failed to update domain')

// ❌ 错误
console.log('Syncing domains')
console.error(error)
```

### 11.2 日志查看

```bash
# 启动开发服务器并格式化日志
cd packages/server
pnpm dev  # Pino 结构化日志输出

# 或者通过管道格式化（需安装 pino-pretty）
pnpm dev | pnpm pino-pretty
```

---

## 12. 添加新服务商的步骤

1. **创建目录** `providers/<new-provider>/`
2. **实现 apiClient.ts** — 封装官方 SDK / HTTP API
3. **实现 provider.ts** — 继承 `DNSProvider` 抽象类，实现 `listRecords` / `createRecord` / `updateRecord` / `deleteRecord`
4. **实现 syncer.ts** — 继承 `DomainSyncer` 抽象类，实现 `syncDomains`
5. **（可选）实现 renewer.ts** — 继承 `DomainRenewer` 抽象类，实现 `renewDomain`
6. **实现 index.ts** — 注册到 `DNSProviderFactory`
7. **更新 config.ts** — 在 `BUILT_IN_PROVIDERS` 中添加新服务商的 `fields` 和 `features` 配置
8. **在 providers/index.ts 中 import** — 触发注册

---

## 13. 快速检查清单（提交前）

- ✅ 所有 `import` 语句带 `.js` 扩展名
- ✅ 使用 `@/` 别名跨模块引用
- ✅ 所有 POST / PUT / PATCH 路由使用 Zod schema 校验参数
- ✅ 使用 `sendSuccess` / `sendError` 返回统一响应格式
- ✅ 使用 `HTTP_STATUS` 常量而非硬编码数字状态码
- ✅ 没有 `console.log` / `console.error` / `console.warn`
- ✅ 使用 `logger.info / warn / error` 记录日志
- ✅ 所有查询/更新/删除包含 `userId` 过滤（用户数据隔离）
- ✅ `routes/` 层不直接调用 `prisma.*`（走 service → model）
- ✅ `services/` 层不直接调用 `prisma.*`（走 model）
- ✅ `providers/` 层不访问数据库，不写业务判断
- ✅ ProviderFeatures 在执行能力相关操作前做了校验
- ✅ Provider 的 `config` 字段在 service 层做了 `JSON.parse` 解析和验证
- ✅ 删除操作正确处理级联（Provider 手动级联，Domain 自动级联）
- ✅ `pnpm lint` 无错误
- ✅ `pnpm typecheck` 前后端类型检查通过
- ✅ 后端 `pnpm build:server` 生产构建通过
