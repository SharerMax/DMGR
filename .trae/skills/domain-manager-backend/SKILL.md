# Domain Manager 后端开发 Skill

> 面向 AI Agent 的后端开发操作指南。当你需要修改 `packages/server/` 下的代码时，先阅读本文件。
> **相关规则**：`rules/backend.md`（声明式规则）、`rules/project.md`（项目级规则）。本文件只提供操作步骤和代码模板，不重复规则条目。

---

## 1. 快速开始：你的第一个后端改动

假设你需要添加一个新的 API 端点（如 `GET /api/domains/:id/details`），按以下步骤执行：

1. **定义数据层** — 在 `models/domain.ts` 中添加查询函数
2. **实现业务逻辑** — 在 `services/domainService.ts` 中实现业务处理
3. **定义路由处理器** — 在 `routes/domains.ts` 中添加 handler
4. **挂载路由** — 在 `routes/domains.ts` 的 router 中添加 `router.get('/:id/details', ...)`
5. **质量保证** — `pnpm lint` → `pnpm typecheck` → `pnpm build:server`

---

## 2. 目录结构（后端细节，唯一来源）

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
│   ├── notificationConfig.ts
│   ├── notificationLog.ts
│   ├── renewalLog.ts
│   └── syncLog.ts
├── prisma/                  # 业务脚本 + 生成产物（schema/migrations 在 packages/server/prisma/）
│   ├── seed.ts              # 种子数据
│   ├── cleanup.ts           # 脏数据清理脚本
│   └── generated/           # Prisma Client 自动生成（gitignored，由 schema.prisma output 指向此处）
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
│   ├── dnshe/               # DNSHE 免费域名服务（X-API-Key + X-API-Secret 鉴权，支持续期）
│   ├── dnspod/              # DNSPod
│   ├── namecheap/           # Namecheap
│   ├── vps8/                # VPS8
│   ├── gleam/               # Gleam (HL6 API，apiKey 鉴权)
│   └── index.ts             # DNSProviderFactory + 聚合导出
├── notifications/           # 通知渠道适配层
│   ├── base.ts              # NotificationSender 接口 + NotificationType + NotificationSenderFactory
│   ├── config.ts            # BUILT_IN_NOTIFICATION_CHANNELS 渠道字段配置
│   ├── email/               # Email (nodemailer + SMTP，读取 SMTP_* 环境变量)
│   │   ├── smtp.ts          # isEmailConfigured() / getSmtpConfig()
│   │   ├── sender.ts        # EmailSender 实现
│   │   └── index.ts         # 注册到工厂
│   ├── telegram/            # Telegram (Bot API sendMessage)
│   │   ├── sender.ts
│   │   └── index.ts
│   ├── feishu/              # 飞书 (机器人 webhook)
│   │   ├── sender.ts
│   │   └── index.ts
│   ├── webhook/             # 通用 Webhook (POST JSON)
│   │   ├── sender.ts
│   │   └── index.ts
│   └── index.ts             # 注册所有渠道 + 聚合导出
├── routes/                  # 控制器层
│   ├── auth.ts
│   ├── providers.ts
│   ├── domains.ts
│   ├── dnsRecords.ts
│   ├── notificationChannels.ts
│   ├── notificationConfigs.ts
│   ├── notificationLogs.ts
│   ├── renewalLogs.ts
│   ├── syncLogs.ts
│   └── dashboard.ts         # 概览数据
├── services/                # 业务服务层
│   ├── autoRenewService.ts  # 自动续期调度
│   ├── providerService.ts   # 服务商业务逻辑（含同步写 SyncLog）
│   ├── domainService.ts     # 域名业务逻辑
│   ├── dnsRecordService.ts  # DNS 记录业务逻辑
│   ├── notificationChannelService.ts
│   ├── notificationConfigService.ts
│   ├── notificationLogService.ts
│   ├── renewalLogService.ts
│   ├── syncLogService.ts    # 同步日志业务层
│   ├── userService.ts
│   ├── notificationService.ts
│   └── dashboardService.ts  # 概览数据聚合
├── utils/                   # 工具函数
│   ├── logger.ts
│   ├── requestLogger.ts
│   ├── response.ts          # sendSuccess / sendError + HTTP_STATUS
│   └── index.ts
└── index.ts                 # 服务器入口（路由注册 + 中间件 + 启动）
```

> **Prisma 配置目录**（`packages/server/prisma/`，与 `src/` 同级）：存放业务无关的 `schema.prisma`、`migrations/`、`migration_lock.toml`、`dev.db`。`schema.prisma` 的 `output = "../src/prisma/generated"` 使 Prisma Client 生成到 `src/prisma/generated/`（保持在 `tsconfig.json` 的 `rootDir: "src"` 内，避免跨 rootDir 引用）。路径解析由 `prisma.config.ts` 统一配置。

---

## 3. 分层调用模式（CRUD 端点模板）

分层规则见 `rules/backend.md` §2。以下是添加新 CRUD 端点的完整模板。

### Step 1: Model 层（`models/domain.ts`）

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

### Step 2: Service 层（`services/domainService.ts`）

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

### Step 3: Route 层（`routes/domains.ts`）

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

### Step 4: 在主入口挂载路由（`index.ts`）

```typescript
import domainRoutes from '@/routes/domains.js'
app.use('/api/domains', domainRoutes)
```

---

## 4. ProviderFeatures 工厂创建与能力校验模板

能力声明规则与矩阵见 `rules/backend.md` §8。以下是代码模板。

### 4.1 通过工厂创建实例

```typescript
import { DNSProviderFactory } from '@/providers/index.js'

// 解析 provider.config（JSON 字符串）
const config = JSON.parse(provider.config)

// 创建对应能力的实例
const dns = DNSProviderFactory.createProvider(provider.type, config)
const syncer = DNSProviderFactory.createSyncer(provider.type, config)
const renewer = DNSProviderFactory.createRenewer(provider.type, config)
```

### 4.2 service 层能力校验模板

```typescript
import { BUILT_IN_PROVIDERS } from '@/providers/config.js'

const provider = await getProviderById(providerId, userId)
const builtin = BUILT_IN_PROVIDERS[provider.type]

// 同步域名前检查
if (!builtin?.features.domainSync) {
  throw new Error(`该服务商（${provider.name}）不支持域名同步`)
}

// DNS 管理前检查
if (!builtin?.features.dnsManagement) {
  throw new Error(`该服务商（${provider.name}）不支持 DNS 记录管理`)
}

// 自动续期前检查
if (!builtin?.features.autoRenew) {
  throw new Error(`该服务商（${provider.name}）不支持自动续期`)
}
```

---

## 5. 统一响应格式用法

响应格式规则见 `rules/project.md` §5。

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

## 6. 导入规范示例

导入规则见 `rules/backend.md` §3。

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

### 7.3 Zod 常用验证器速查

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
| 配置字段（对象） | `z.record(z.string(), z.string())` |

---

## 8. userId 数据隔离模板

隔离规则见 `rules/backend.md` §6。

```typescript
import prisma from '@/db/index.js'

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

## 9. 删除操作与级联处理模板

级联规则见 `rules/backend.md` §7。

### 9.1 删除 Provider（手动级联，事务保证原子性）

```typescript
// 在 services/providerService.ts 中处理
await prisma.$transaction(async (tx) => {
  // 1. 删除该 provider 下的所有域名（会自动级联删除 DNSRecord / RenewalLog）
  await tx.domain.deleteMany({ where: { providerId, userId } })
  // 2. 删除 provider
  await tx.provider.deleteMany({ where: { id: providerId, userId } })
})
```

### 9.2 删除 Domain（DB 层自动级联）

`Domain → DNSRecord / RenewalLog` 在 Prisma schema 中设置为 `onDelete: Cascade`，删除域名时自动清理，无需手动处理。

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

## 11. 数据库模型速查表（唯一来源）

| 模型 | 关键字段 | 说明 |
|------|---------|------|
| `User` | `id`、`username`、`password`（bcrypt 哈希）、`email?` | 用户账号 |
| `Provider` | `id`、`type`、`name`、`config`（JSON 字符串）、`userId` | 服务商配置（能力声明通过 `ProviderFeatures` 在 `providers/config.ts` 中定义，见 `rules/backend.md` §8） |
| `Domain` | `id`、`name`、`providerId?`、`expiryDate?`、`renewalPrice?`、`notes?`、`autoRenew`、`autoRenewDays?`、`status`、`userId` | 域名 |
| `DNSRecord` | `id`、`domainId`、`type`、`name`、`value`、`ttl`、`priority?` | DNS 记录 |
| `NotificationChannel` | `id`、`type`、`name`、`config`（JSON 字符串）、`isActive`、`userId` | 通知渠道（仅描述「如何发送」，不包含「何时发送」配置） |
| `NotificationConfig` | `id`、`userId`、`type`（expiry_reminder/renewal_success/renewal_failed/sync_completed）、`enabled`、`expiryDays?`（仅 expiry_reminder 使用：提前多少天提醒）、`@@unique([userId, type])` | 用户级通知类型开关与过期提醒阈值 |
| `RenewalLog` | `id`、`domainId`、`status`、`message?`、`error?`、`renewedAt?`、`createdAt` | 续期日志 |
| `NotificationLog` | `id`、`userId`、`domainId?`、`type`、`content`、`channel`、`sentAt` | 通知发送日志 |
| `SyncLog` | `id`、`providerId`、`userId`、`status`（success/failed/partial）、`domainsSynced`、`dnsInserted`、`dnsDeleted`、`error?`、`details?`（JSON 字符串，含具体变更域名/DNS 记录）、`createdAt` | 服务商域名同步审计日志 |

**级联关系**：
- `Provider → Domain`：手动级联（删除服务商时由 service 层显式删除关联域名），DB 层为 `SetNull`
- `Domain → DNSRecord / RenewalLog`：DB 层 `onDelete: Cascade`

---

## 12. SyncLog 同步审计说明

日志规则见 `rules/project.md` §6。SyncLog 审计规则见 `rules/backend.md` §10。

- `providerService.syncProviderDomains` 在每次同步完成后写入一条 `SyncLog` 记录
- `models/dnsRecord.ts` 的 `syncDomainDNSRecords` 返回 `insertedRecords` 与 `deletedRecords` 数组（而非仅计数），供 service 层组装 `details`
- 前端通过 `/api/sync-logs` 查询历史同步记录（含筛选与分页）

---

## 13. 添加新服务商的步骤

1. **创建目录** `providers/<new-provider>/`
2. **实现 apiClient.ts** — 封装官方 SDK / HTTP API
3. **实现 provider.ts** — 继承 `DNSProvider` 抽象类，实现 `listRecords` / `createRecord` / `updateRecord` / `deleteRecord`
4. **实现 syncer.ts** — 继承 `DomainSyncer` 抽象类，实现 `syncDomains`
5. **（可选）实现 renewer.ts** — 继承 `DomainRenewer` 抽象类，实现 `renewDomain`
6. **实现 index.ts** — 注册到 `DNSProviderFactory`
7. **更新 config.ts** — 在 `BUILT_IN_PROVIDERS` 中添加新服务商的 `fields` 和 `features` 配置
8. **在 providers/index.ts 中 import** — 触发注册

---

## 14. 提交前检查

代码审查与自检清单见 `skills/domain-manager-review`。
