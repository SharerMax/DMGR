# Domain Manager 共享类型 Skill

> 面向 AI Agent 的 `packages/share` 操作指南。当你需要新增 / 修改前后端共享的 API 契约类型（实体、Input、Filter、Stats 等）时，先阅读本文件。
> **相关规则**：`rules/project.md` §2.1 / §4 / §8 / §11、`rules/backend.md` §3 / §6、`rules/frontend.md` §4 / §5。本文件只提供操作步骤和代码模板，不重复规则条目。

---

## 1. share 包是什么

`packages/share` 是 DMGR monorepo 中**专门存放前后端共享 API 契约类型**的 workspace 包。

| 维度 | 说明 |
|------|------|
| 性质 | **仅类型导出**（type-only），不含任何运行时值（const / function / class） |
| 消费方式 | 源码直消费（`exports` 指向 `./src/index.ts`），无 build 步骤 |
| 解析机制 | 依赖 `moduleResolution: "bundler"`，TS 直接解析 `.ts` 源码 |
| 导入语法 | 必须 `import type { ... } from 'share'`（编译期擦除，不进入运行时产物） |
| 依赖关系 | `client` 和 `server` 的 `package.json` 通过 `"share": "workspace:*"` 引用 |

**为什么不发 build 产物？**
- share 包无运行时代码，build 出来的 `.js` 为空，build 步骤是冗余开销
- 源码直消费让类型修改即时生效，无需 `pnpm build` 才能看到效果
- `import type` 在编译期被完全擦除，前后端产物中不会出现 `share` 的运行时引用

---

## 2. 目录结构与当前类型清单

```
packages/share/
├── package.json              # { "exports": { ".": "./src/index.ts" } }
├── tsconfig.json             # moduleResolution: bundler, noEmit: true
└── src/
    ├── index.ts              # 聚合 re-export（唯一对外入口）
    ├── api.ts                # ApiResponse<T> 统一响应格式
    ├── pagination.ts         # Pagination / PaginatedResponse<T>
    ├── provider.ts           # ProviderField / ProviderFeatures
    ├── providerEntity.ts     # Provider / CreateProviderInput / UpdateProviderInput / ProviderType
    ├── domain.ts             # Domain / CreateDomainInput / UpdateDomainInput / DomainFilters
    ├── dnsRecord.ts          # DNSRecord / DNSRecordType / Create/UpdateDNSRecordInput
    ├── renewalLog.ts         # RenewalLog / RenewalLogStatus / RenewalLogFilters / RenewalLogStats / AutoRenewConfig
    ├── notificationLog.ts    # NotificationLog / NotificationType / NotificationChannelType / NotificationLogFilters
    ├── notificationChannel.ts# NotificationChannel / Create/UpdateNotificationChannelInput
    ├── notificationConfig.ts # NotificationConfig / NotificationConfigType / UpdateNotificationConfigInput
    ├── syncLog.ts            # SyncLog / SyncLogStatus / SyncLogFilters / SyncDetails / DomainChange / DNSChangeDetail
    ├── user.ts               # User / CreateUserInput / LoginInput
    └── dashboard.ts          # DashboardStats / DashboardData / RecentNotification / RecentRenewal / ExpiringDomain
```

**类型组织原则**：
- 一个领域一个文件（与 `models/` 一一对应）
- 跨领域共享类型（如 `NotificationType` 在 `notificationLog.ts` 定义，被 `notificationConfig.ts` 通过 `import type` 复用）放在概念上"更基础"的文件中
- `index.ts` 按字母序聚合导出，是消费方唯一入口

---

## 3. 后端消费模式（`packages/server`）

### 3.1 Model 层：Prisma Date 与 share string 的衔接

share 实体类型用 `string` 表示日期（JSON wire 格式），但 Prisma 生成的实体类型用 `Date`。**model 函数返回类型用 Prisma 版本，API 响应类型用 share 版本**：

```typescript
// packages/server/src/models/domain.ts
import prisma from '@/db/index.js'
import type { CreateDomainInput, UpdateDomainInput } from 'share'
import type { Domain } from '../prisma/generated/client'

// 重新导出 share 版本作为对外 API 契约类型（覆盖 Prisma 版本）
export type { CreateDomainInput, Domain, UpdateDomainInput }

// model 函数签名：用交叉类型扩展 userId（share 的 Input 不含 userId）
export async function createDomain(input: CreateDomainInput & { userId: number }) {
  return prisma.domain.create({
    data: {
      name: input.name,
      providerId: input.providerId ?? null,
      expiryDate: input.expiryDate ?? null,
      // ...
      userId: input.userId,
    },
  })
}

// 列表查询：Filter 类型同样用交叉类型扩展 userId
export async function listDomains(filters: DomainFilters & { userId: number }) {
  return prisma.domain.findMany({
    where: {
      userId: filters.userId,
      ...(filters.providerId ? { providerId: filters.providerId } : {}),
      ...(filters.search ? { name: { contains: filters.search } } : {}),
    },
  })
}
```

### 3.2 Filter 类型扩展模式

share 的 `XxxFilters` 类型**不含 `userId` 也不含分页参数**（API 契约层不能信任客户端）。后端 model 用交叉类型扩展：

```typescript
// packages/server/src/models/renewalLog.ts
import type { RenewalLogFilters } from 'share'

export type { RenewalLogFilters, RenewalLog }

// 带 userId 的扩展类型，仅后端内部使用
export type RenewalLogFiltersWithUser = RenewalLogFilters & { userId?: number }

export async function getRenewalLogs(filters: RenewalLogFiltersWithUser) {
  return prisma.renewalLog.findMany({
    where: buildWhere(filters),
    // ...
  })
}

function buildWhere(filters: RenewalLogFiltersWithUser) {
  const where: Prisma.RenewalLogWhereInput = {}
  if (filters.userId !== undefined) where.domain = { ...where.domain, userId: filters.userId }
  if (filters.providerId !== undefined) where.domain = { ...where.domain, providerId: filters.providerId }
  // ...
  return where
}
```

### 3.3 运行时常量保留在后端

share 是仅类型包，**禁止**导出 const / function。运行时常量保留在后端：

```typescript
// packages/server/src/models/notificationConfig.ts
import type { NotificationType, UpdateNotificationConfigInput } from 'share'

export type { NotificationConfig, NotificationType, UpdateNotificationConfigInput }

/** 通知类型列表（运行时常量，与 share 的 NotificationType 类型保持一致） */
export const NOTIFICATION_TYPES: NotificationType[] = [
  'expiry_reminder',
  'renewal_success',
  'renewal_failed',
  'sync_completed',
]
```

**反例**（禁止）：把 `NOTIFICATION_TYPES` 放入 share 包 → 后端 `dist/` 会出现 `import { NOTIFICATION_TYPES } from 'share'` 运行时引用 → Node.js 启动报错 `ERR_MODULE_NOT_FOUND`。

### 3.4 Service 层：Stats 类型兼容性

当 Prisma 返回的对象字段类型（`Date`）与 share 的 Stats 类型（`string`）不兼容时，service 层可保留本地类型：

```typescript
// packages/server/src/services/renewalLogService.ts
import type { AutoRenewConfig } from 'share'

export type { AutoRenewConfig }

// 本地类型：recentLogs 用 any[] 避免 Prisma Date 与 share string 冲突
interface RenewalSummaryResult {
  summary: { total: number; completed: number; /* ... */ }
  recentLogs: Array<{ id: number; domain: { name: string }; createdAt: Date }>
}
```

---

## 4. 前端消费模式（`packages/client`）

### 4.1 Store 中导入共享类型

```typescript
// packages/client/src/stores/domains.ts
import type { CreateDomainInput, Domain } from 'share'
import type { PaginatedResponse } from 'share'
import { api } from '@/lib/api'

interface DomainsState {
  domains: Domain[]
  // ...
  fetchDomains: () => Promise<void>
  createDomain: (input: CreateDomainInput) => Promise<Domain>
}

export const useDomainsStore = create<DomainsState>((set) => ({
  domains: [],
  fetchDomains: async () => {
    const data = await api.get<PaginatedResponse<Domain>>('/api/domains')
    set({ domains: data.data })
  },
  createDomain: async (input) => {
    const domain = await api.post<Domain>('/api/domains', input)
    return domain
  },
}))
```

### 4.2 本地扩展例外：UI 哨兵值与分页参数

share 的 Filter 类型不含 `page` / `pageSize`（分页由 store 内部状态管理），也不含 UI 特定的哨兵值（如 Select 的 `'all'`）。前端通过**继承 share 类型**扩展：

```typescript
// packages/client/src/stores/renewalLogs.ts
import type {
  PaginatedResponse,
  RenewalLog,
  RenewalLogFilters as SharedRenewalLogFilters,
  RenewalLogStats,
} from 'share'

export type { RenewalLog, RenewalLogStats }
export type RenewalLogsResponse = PaginatedResponse<RenewalLog>

// 本地扩展：补充分页参数
export interface RenewalLogFilters extends SharedRenewalLogFilters {
  page?: number
  pageSize?: number
}
```

```typescript
// packages/client/src/stores/domains.ts
import type { DomainFilters as SharedDomainFilters } from 'share'

// 本地扩展：UI Select 的 'all' 哨兵值
export interface DomainFilters extends SharedDomainFilters {
  providerId?: number | 'all'  // share 是 number，前端扩展为联合类型
  page?: number
  pageSize?: number
}
```

### 4.3 类型别名向后兼容

当 store 历史代码使用本地命名（如 `CreateChannelInput`），迁移到 share 时可用 `type` 别名保持引用兼容：

```typescript
// packages/client/src/stores/notificationChannels.ts
import type {
  CreateNotificationChannelInput,
  NotificationChannel,
  NotificationChannelType,
  UpdateNotificationChannelInput,
} from 'share'

// 本地别名：用于 store 内部引用（export type { X as Y } 不创建本地绑定）
type CreateChannelInput = CreateNotificationChannelInput

export type { CreateChannelInput, NotificationChannel, NotificationChannelType, UpdateNotificationChannelInput }
```

---

## 5. 新增共享类型的完整流程

假设你需要新增一个 `Tag` 实体的共享类型（前后端都会用到）：

### Step 1: 创建 share 源文件

```typescript
// packages/share/src/tag.ts
/** 标签实体（API 响应格式） */
export interface Tag {
  id: number
  name: string
  color: string | null
  userId: number
  createdAt: string
  updatedAt: string
}

/** 创建标签输入（API 请求体，不含 userId） */
export interface CreateTagInput {
  name: string
  color?: string | null
}

/** 更新标签输入 */
export interface UpdateTagInput {
  name?: string
  color?: string | null
}

/** 标签筛选条件 */
export interface TagFilters {
  search?: string
}
```

### Step 2: 在 index.ts 中聚合导出（按字母序）

```typescript
// packages/share/src/index.ts
export * from './api'
export * from './dashboard'
// ... 其他
export * from './syncLog'
export * from './tag'      // 新增（按字母序插入 syncLog 之后、user 之前）
export * from './user'
```

### Step 3: 后端 model 层衔接

```typescript
// packages/server/src/models/tag.ts
import prisma from '@/db/index.js'
import type { CreateTagInput, TagFilters, UpdateTagInput } from 'share'
import type { Tag } from '../prisma/generated/client'

export type { CreateTagInput, Tag, TagFilters, UpdateTagInput }

export async function createTag(input: CreateTagInput & { userId: number }) {
  return prisma.tag.create({ data: { ...input, userId: input.userId } })
}

export async function listTags(filters: TagFilters & { userId: number }) {
  return prisma.tag.findMany({
    where: {
      userId: filters.userId,
      ...(filters.search ? { name: { contains: filters.search } } : {}),
    },
  })
}
```

### Step 4: 前端 store 消费

```typescript
// packages/client/src/stores/tags.ts
import type { CreateTagInput, Tag, TagFilters as SharedTagFilters } from 'share'
import type { PaginatedResponse } from 'share'
import { api } from '@/lib/api'

export interface TagFilters extends SharedTagFilters {
  page?: number
  pageSize?: number
}

interface TagsState {
  tags: Tag[]
  fetchTags: (filters?: TagFilters) => Promise<PaginatedResponse<Tag>>
  createTag: (input: CreateTagInput) => Promise<Tag>
}

export const useTagsStore = create<TagsState>((set) => ({
  tags: [],
  fetchTags: async (filters) => {
    return api.get<PaginatedResponse<Tag>>('/api/tags', { params: filters })
  },
  createTag: async (input) => {
    const tag = await api.post<Tag>('/api/tags', input)
    set((state) => ({ tags: [tag, ...state.tags] }))
    return tag
  },
}))
```

### Step 5: 质量保证

```powershell
pnpm typecheck   # 前后端 + share 全部通过
pnpm lint        # 0 errors
pnpm build:server  # 验证后端产物中无 share 运行时引用
```

---

## 6. 陷阱清单（已踩过的坑）

| 陷阱 | 现象 | 解决方案 |
|------|------|---------|
| **值导入 share** | `import { Domain } from 'share'` → 后端 `dist/` 出现运行时引用 → Node.js 启动报 `ERR_MODULE_NOT_FOUND` | 一律 `import type { Domain } from 'share'` |
| **share 中导出 const** | 后端 `dist/` 出现 `import { NOTIFICATION_TYPES } from 'share'` 运行时引用 | 运行时常量保留在后端 model 文件中 |
| **Prisma Date 不兼容 share string** | service 返回 `RenewalLogStats`，`recentLogs.createdAt` 类型冲突 | service 层保留本地 Stats 类型，`recentLogs: any[]` 或本地定义 |
| **`export type { X as Y }` 不创建本地绑定** | store 接口内引用 `CreateChannelInput` 报错 "Cannot find name" | 用 `type CreateChannelInput = CreateNotificationChannelInput` 创建本地别名 |
| **忘记在 index.ts 聚合导出** | 消费方 `import type { Tag } from 'share'` 报 "has no exported member" | 在 `index.ts` 加 `export * from './tag'` |
| **直接穿透到 share 子路径** | `import type { Domain } from 'share/src/domain'` 报错 | 统一从根 `from 'share'` 导入 |
| **Filter 类型包含 userId** | 后端从客户端 `userId` 入参查询 → 越权风险 | share 的 Filter 不含 `userId`；后端用 `& { userId: number }` 扩展 |
| **Filter 类型包含分页参数** | 前端 store 状态与 API 契约混淆 | share 的 Filter 不含 `page`/`pageSize`；前端 store 本地扩展 |

---

## 7. 何时该 / 不该 添加到 share

**应该添加**：
- 实体类型（API 响应格式）：`Domain` / `Provider` / `DNSRecord` / ...
- Input 类型（API 请求体）：`Create*Input` / `Update*Input`
- Filter 类型（API 查询参数）：`*Filters`（不含 `userId` 和分页）
- Stats 类型（统计聚合响应）：`*Stats`
- 跨领域共用枚举/字面量联合：`NotificationType` / `DNSRecordType` / `*Status`
- 通用容器：`ApiResponse<T>` / `PaginatedResponse<T>` / `Pagination`

**不应添加**：
- Prisma 内部函数签名类型（用 `Date`，留在后端）
- 运行时常量（`NOTIFICATION_TYPES` / `BUILT_IN_PROVIDERS` 等）
- 前端 UI 专用扩展（`'all'` 哨兵值、`page`/`pageSize` 分页参数）
- 后端内部扩展（`*FiltersWithUser` / `*ServiceResult` 等带 `Date` 的本地类型）
- Provider / Notification 适配器内部实现类型（它们是后端私有）

---

## 8. 验证清单

修改 share 包后必须确认：

- [ ] `pnpm typecheck`（前后端 + share 三个 workspace 全部通过）
- [ ] `pnpm lint`（0 errors）
- [ ] `pnpm build:server`（验证后端 `dist/` 中无 `from 'share'` 的运行时引用）
- [ ] 新增文件已加入 `src/index.ts` 聚合导出（按字母序）
- [ ] 消费方一律使用 `import type`（grep 检查：`Select-String -Path "packages\*\src\**\*.ts" -Pattern "^import\s+\{[^}]*\}\s+from\s+'share'"` 应仅匹配 `import type`）
- [ ] 未在 share 中导出任何 const / function / class
