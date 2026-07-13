# AGENTS.md — Domain Manager 项目指南

> **面向 AI Agent 的项目架构、技术栈与开发规范速查手册。**
> 阅读本文件后，你应该能迅速地在这个代码库中完成一次高质量的代码变更。

---

## 0. 快速决策路径（开始前必读）

根据你的任务类型，按以下路径找到对应的规范与技能文档：

```
你的任务是什么？
│
├─ 修改 前端 React 代码（页面/组件/表单/Store）
│   └─ 必读：.trae/rules/frontend.md + .trae/skills/domain-manager-frontend/SKILL.md
│
├─ 修改 后端 Express 代码（API/Service/Model/Provider）
│   └─ 必读：.trae/rules/backend.md + .trae/skills/domain-manager-backend/SKILL.md
│
├─ 配置 / 命令 / 依赖 / 迁移 / 开发流程问题
│   └─ 必读：.trae/skills/domain-manager-dev/SKILL.md
│
├─ 遇到 Bug / 错误 / 问题排查
│   └─ 必读：.trae/skills/domain-manager-debug/SKILL.md
│
├─ 代码审查 / 质量检查 / 提交前自检
│   └─ 必读：.trae/skills/domain-manager-review/SKILL.md
│
└─ 通用规范（代码风格、Git、目录命名、安全等）
    └─ 必读：.trae/rules/project.md
            + .trae/rules/local.md （Windows 环境相关）
```

> **原则**：`rules/` 是「必须遵守的规范」，`skills/` 是「怎么做的实操指南」。如果两者有冲突，以 `rules/` 为准。

---

## 1. 项目概览

**Domain Manager** — 一个用于集中管理多服务商域名与 DNS 记录的单页应用（SPA）。

- 后端：Express.js 5.2 + TypeScript + Prisma + SQLite + Zod + Pino logger
- 前端：React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS v4 + Zustand + react-hook-form + sonner + Axios
- Node.js：`>=22.21`（本项目使用 ESM，所有后端 import 必须带 `.js` 扩展名）
- 包管理：**仅使用 pnpm**；依赖版本集中在 `pnpm-workspace.yaml` 的 `catalog` 字段声明，各 workspace 的 `package.json` 以 `"pkg": "catalog:"` 引用
- Monorepo 结构：`packages/client` + `packages/server`

### 1.1 核心能力

| 能力 | 说明 |
|------|------|
| 多服务商域名管理 | 阿里云 / 腾讯云 / Cloudflare / DNSPod / Namecheap / VPS8 / Gleam |
| DNS 记录管理 | 每个域名下增删改查各类 DNS 记录 |
| 自动续期调度 | 由 `autoRenewService.ts` 按 cron 表达式定时执行续期任务 |
| 通知渠道 | 配置通知渠道，用于域名过期、续期结果等消息推送 |
| 服务商能力声明 | 通过 `ProviderFeatures` 对象声明各服务商支持的能力 |
| 同步审计 | 通过 `SyncLog` 记录服务商域名同步操作的成功/失败/部分成功状态及变更明细 |

### 1.2 启动与常用命令

```bash
# 依赖安装
pnpm install --no-frozen-lockfile

# 启动开发服务器（分别启动）
pnpm dev:server   # 后端 API：http://localhost:3001
pnpm dev:client   # 前端 SPA：http://localhost:3000

# 或同时启动前后端
pnpm dev

# 类型检查（前后端同时）
pnpm typecheck

# 代码风格检查 / 自动修复
pnpm lint
pnpm lint:fix

# 数据库操作
cd packages/server
pnpm prisma generate          # schema.prisma 变更后必须执行
pnpm prisma migrate dev       # 创建并应用迁移
pnpm prisma db seed           # 写入种子数据
pnpm tsx src/prisma/cleanup.ts  # 清理脏数据（孤立记录、测试数据）
```

### 1.3 测试账号

执行 `pnpm prisma db seed` 后可用：
- 用户名：`admin`，密码：`password123`
- 邮箱：`admin@example.com`，密码：`password123`

---

## 2. 目录结构

```
DMGR/
├── .trae/
│   ├── rules/                 # 项目规则（必须遵守）
│   │   ├── project.md         # 通用：包管理、提交、分层、安全
│   │   ├── frontend.md        # 前端：表单、组件、状态管理
│   │   ├── backend.md         # 后端：API、分层、数据库
│   │   └── local.md           # 本地环境：Windows、命令
│   └── skills/                # 项目技能（实操指南）
│       ├── domain-manager-backend/SKILL.md   # 后端开发指南
│       ├── domain-manager-frontend/SKILL.md  # 前端开发指南
│       ├── domain-manager-dev/SKILL.md       # 开发流程 / 命令速查
│       ├── domain-manager-debug/SKILL.md     # 问题排查 / 快速修复
│       └── domain-manager-review/SKILL.md    # 代码审查 / 提交前自检
├── packages/
│   ├── client/               # 前端 (React 19 + Vite + shadcn/ui + Zustand + react-hook-form)
│   │   └── src/
│   │       ├── components/   # 自定义 UI 组件（Logo、DatePicker、Pagination、DomainFilter）
│   │       │   └── ui/       # shadcn/ui CLI 生成的标准组件（不手动修改）
│   │       ├── hooks/        # useConfirm 等自定义 Hooks
│   │       ├── lib/          # api.ts（Axios 实例）、utils.ts
│   │       ├── pages/        # Login / Domains / Providers / NotificationChannels / Profile / RenewalLogs / AutoRenewConfig / SyncLogs
│   │       ├── stores/       # Zustand Stores（按领域拆分：auth/domains/providers/dnsRecords/notificationChannels/renewalLogs/syncLogs/theme）
│   │       ├── App.tsx       # 路由 + 布局 + 主题 + Toaster
│   │       └── main.tsx
│   └── server/               # 后端 (Express 5 + Prisma + SQLite + Zod + Pino)
│       └── src/
│           ├── db/           # Prisma Client 初始化
│           ├── middleware/   # auth.ts（JWT 鉴权）、index.ts（聚合导出）
│           ├── models/       # 纯 CRUD（user / provider / domain / dnsRecord / notificationChannel / renewalLog / syncLog）
│           ├── prisma/       # schema.prisma + seed.ts + cleanup.ts + migrations
│           ├── providers/    # 第三方服务商适配层（按服务商拆分子目录）
│           │   ├── base.ts   # DNSProvider / DomainSyncer / DomainRenewer 抽象基类 + ProviderFeatures
│           │   ├── config.ts # 内置服务商配置（fields 驱动前端动态表单 + features 声明能力）
│           │   ├── aliyun/ tencent/ cloudflare/ dnspod/ namecheap/ vps8/ gleam/
│           │   │   ├── apiClient.ts / provider.ts / syncer.ts / renewer.ts / index.ts
│           │   └── index.ts  # DNSProviderFactory + 统一导出
│           ├── routes/       # 控制器层：Zod 参数校验 + 调用 service + sendSuccess/sendError
│           ├── services/     # 业务服务层：业务逻辑 + 权限校验 + 多表协调
│           ├── utils/        # logger.ts / requestLogger.ts / response.ts / index.ts
│           └── index.ts      # 服务器入口
├── pnpm-workspace.yaml       # catalog 依赖版本声明
├── skills-lock.json          # 项目技能锁定文件
└── package.json              # 根 workspace：pnpm typecheck / lint 等聚合脚本
```

---

## 3. 分层架构与调用链（核心原则）

```
前端 React 页面（react-hook-form 校验 + sonner toast）
     │
     ▼
  Zustand Store ──► lib/api.ts (Axios + JWT) ──► 后端 API
                                                  (HTTP + JSON, code/message/data 统一响应)
                                                          │
                                                          ▼
                                                   routes/*（控制器层：Zod 校验 + authMiddleware + send*）
                                                          │
                                                          ▼
                                                   services/*（业务层：逻辑 + 权限 + 多表协调 + provider 调用）
                                                          │
                                                          ▼
                                                   models/*（数据层：纯 CRUD + userId 隔离）
                                                          │
                                                          ▼
                                                   db/index.ts (Prisma Client) ─► SQLite
```

**严格的单向调用，禁止跨层**：

| 层 | 可以做 | 禁止做 |
|----|--------|--------|
| `routes/` | 参数校验（Zod）、鉴权中间件、调用 service、用 `sendSuccess/sendError` 返回统一响应 | 直接调用 `models/` 或 `prisma.*`、直接调用三方 API |
| `services/` | 业务逻辑、权限校验（userId 过滤）、多表协调、事务、调用 models/providers | 直接构造 HTTP 响应、直接调用 prisma |
| `providers/<name>/` | 封装官方 SDK / 签名算法 / HTTP 请求、解析业务响应、暴露领域方法 | 访问数据库、写业务判断 |
| `models/` | 纯 CRUD（`getById`/`create`/`updateMany`/`deleteMany`/`listByUserId` 等） | 包含业务逻辑、鉴权 |

**关键导入规则**：
- 后端统一使用 ESM `import`，**必须带上 `.js` 扩展名**
- 后端日志使用 Pino：`import { logger } from '@/utils/index.js'`，**禁止 `console.log` / `console.error`**
- 前端通知使用 sonner toast，**禁止使用 `alert()`**
- JWT 认证逻辑集中在 `packages/server/src/middleware/auth.ts`
- API 响应统一格式：`{ code: number, message: string, data?: any }`（code === 0 表示成功）
  - 由 `utils/response.ts` 提供 `sendSuccess(res, data, message?, status?)` 和 `sendError(res, message, code?, status?)`

---

## 4. 表单验证规范（前端核心）

**所有表单必须使用 react-hook-form**，禁止手写 `useState` + `onChange` 校验。

### 4.1 标准模式

```tsx
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'

const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormInput>({
  defaultValues: { name: '', email: '' },
})

const onSubmit = handleSubmit(async (data) => {
  try {
    await createEntity(data)
    toast.success('操作成功')
    reset()
  } catch (error: any) {
    toast.error(error.message || '操作失败')
  }
})

// 原生 Input: register 绑定
<Input {...register('name', { required: '名称必填', maxLength: { value: 50, message: '最多 50 字符' } })} />
{errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}

// shadcn/ui Select / Switch: 必须使用 Controller
<Controller
  control={control}
  name="type"
  rules={{ required: '请选择类型' }}
  render={({ field }) => (
    <Select value={field.value} onValueChange={field.onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="aliyun">阿里云</SelectItem>
      </SelectContent>
    </Select>
  )}
/>
{errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
```

### 4.2 必填字段标识

在 `Label` 文本后添加红色 `*`：

```tsx
<Label htmlFor="name">
  名称
  <span className="text-red-500 ml-1">*</span>
</Label>
<Input id="name" {...register('name', { required: '名称必填' })} />
{errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
```

---

## 5. ProviderFeatures 能力声明系统

每个服务商通过 `providers/config.ts` 的 `BUILT_IN_PROVIDERS` 配置声明其支持的能力：

```typescript
interface ProviderFeatures {
  domainSync: boolean     // 支持域名同步（从服务商拉取域名列表）
  dnsManagement: boolean  // 支持 DNS 记录管理（增删改查 DNS 记录）
  autoRenew: boolean      // 支持自动续期
}
```

**各服务商能力矩阵**：

| 服务商 | domainSync | dnsManagement | autoRenew |
|--------|-----------|---------------|-----------|
| `aliyun` | ✅ | ✅ | ✅ |
| `tencent` | ✅ | ✅ | ✅ |
| `cloudflare` | ✅ | ✅ | ❌ |
| `dnspod` | ✅ | ✅ | ❌ |
| `namecheap` | ✅ | ✅ | ✅ |
| `vps8` | ✅ | ✅ | ❌ |
| `gleam` | ✅ | ✅ | ❌ |

**能力校验规则**：
- 前端根据 `features` 决定是否显示同步按钮、DNS 管理入口
- 后端 `providerService` 在执行操作前校验对应能力字段
- 能力不匹配时返回清晰的错误消息（如："该服务商不支持自动续期"）

### 5.1 DNSProviderFactory

统一通过工厂创建实例：

```typescript
import { DNSProviderFactory } from '@/providers/index.js'

const config = JSON.parse(provider.config)
const dns = DNSProviderFactory.createProvider(provider.type, config)
const syncer = DNSProviderFactory.createSyncer(provider.type, config)
const renewer = DNSProviderFactory.createRenewer(provider.type, config)
```

---

## 6. 用户数据隔离（核心安全原则）

- 所有数据库查询**必须包含 `userId` 过滤条件**
- 使用 `findFirstOrThrow({ where: { id, userId } })` 代替 `findUnique({ where: { id } })`
- 使用 `updateMany({ where: { id, userId }, data })` 代替 `update()`
- 使用 `deleteMany({ where: { id, userId } })` 代替 `delete()`
- 列表查询使用 `findMany({ where: { userId } })`
- `userId` 从 JWT token 解析（`req.user.userId`），**不可信任客户端传递的 userId**

---

## 7. 数据库模型速查

| Model | 关键字段 | 说明 |
|-------|---------|------|
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
- `Provider → Domain`：手动级联（删除服务商时由 service 层显式删除关联域名），DB 层为 `SetNull`
- `Domain → DNSRecord / Reminder / RenewalLog`：DB 层 `onDelete: Cascade`

**脏数据清理**：执行 `pnpm tsx packages/server/src/prisma/cleanup.ts` 清理孤立记录

---

## 8. 删除操作规范

### 8.1 删除 Provider

删除服务商时，必须同时删除其下的所有域名（级联删除 DNS 记录/提醒/续期日志）。
使用 Prisma 事务保证原子性：

```typescript
await prisma.$transaction(async (tx) => {
  await tx.domain.deleteMany({ where: { providerId, userId } })
  await tx.provider.deleteMany({ where: { id: providerId, userId } })
})
```

前端必须使用 `useConfirm` 对话框二次确认，确认文案明确描述级联删除。

### 8.2 删除 Domain

由数据库层自动级联删除 DNS 记录、Reminder、RenewalLog。
前端同样使用 `useConfirm` 对话框确认。

---

## 9. 统一 API 响应格式（前后端契约）

```typescript
// 所有响应都使用以下格式
{ code: number, message: string, data?: any }

// code === 0  → 成功
// code !== 0  → 失败，message 为用户可读的错误信息
```

### 9.1 后端发送

```typescript
import { sendSuccess, sendError, HTTP_STATUS } from '@/utils/response.js'

sendSuccess(res, data, '创建成功', HTTP_STATUS.CREATED)  // 201
sendSuccess(res, data)                                    // 200 OK
sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)    // 400
sendError(res, '未授权', 1, HTTP_STATUS.UNAUTHORIZED)     // 401
sendError(res, '资源不存在', 1, HTTP_STATUS.NOT_FOUND)    // 404
```

### 9.2 前端 Axios 拦截器自动处理

`lib/api.ts` 已内置拦截器，自动：
- 附带 `Authorization: Bearer <token>`
- 401 响应自动跳转 `/login` 并清除本地 token
- 成功响应自动提取 `res.data.data`
- 失败时 `error.message` 即为后端返回的可读 message

使用方式：

```typescript
import api from '@/lib/api'

const res = await api.get<Domain[]>('/domains')
const domains = res.data  // 已是后端响应的 data 字段
```

---

## 10. 环境变量

在根目录或各 workspace 目录创建 `.env`（.gitignore 已排除）：

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | `3001` | 后端端口 |
| `JWT_SECRET` | `dev-secret-change-me` | JWT 签名密钥（生产必须修改） |
| `RENEWAL_CRON_EXPRESSION` | `0 2 * * *` | 自动续期 cron（默认每天凌晨 2 点） |
| `LOG_LEVEL` | `info` | Pino 日志级别（`debug` / `info` / `warn` / `error`） |

---

## 11. 代码变更工作流（最小闭环）

每次代码变更遵循以下流程：

1. **读文档**：根据变更类型，阅读 `.trae/rules/<type>.md` 中的规范 + `.trae/skills/domain-manager-<topic>/SKILL.md` 中的实操指南
2. **实现**：严格按分层架构实现代码
   - 前端表单：`react-hook-form` + `sonner toast`
   - 危险操作：前端 `useConfirm` + 后端 `userId` 隔离
   - Provider 相关：在 `providers/<name>/` 目录内完成，能力声明在 `providers/config.ts`
3. **质量检查**（失败不得提交）：
   - `pnpm lint:fix` 自动修复风格问题
   - `pnpm lint` 确认 0 errors
   - `pnpm typecheck` 确认前后端类型无误
   - 后端 `pnpm build:server` 确认生产构建通过
   - 前端 `pnpm build:client` 确认生产构建通过
4. **代码审查**：参考 `.trae/skills/domain-manager-review/SKILL.md` 的审查清单进行自检
5. **提交**：使用 Conventional Commits 格式

```
<type>(<scope>): <subject>
```

常用 type：`feat` / `fix` / `refactor` / `chore` / `docs` / `style` / `test` / `perf` / `build`
常用 scope：`server` / `client` / `providers` / `db` / `skills`

---

## 12. 反模式清单（以下行为是错误的）

以下模式在本项目中是**禁止的**，如果在代码中发现，请一并修复：

| ❌ 禁止 | ✅ 正确 |
|--------|--------|
| 后端 import 不带 `.js` 扩展名 | `import { xxx } from '@/utils/index.js'` |
| `routes/` 层直接调用 `prisma.*` | 走 `routes → services → models → prisma` |
| 数据库查询不包含 `userId` 过滤 | 使用 `findFirst({ where: { id, userId } })` |
| 前端手写 `useState` 管理表单 | 使用 `react-hook-form` 的 `useForm` |
| shadcn/ui Select 用 `register` 绑定 | 必须用 `Controller` 包裹 |
| 使用 `alert()` 通知用户 | 使用 `toast.success/error/info` |
| 使用 `console.log` / `console.error` | 后端用 `logger.info/warn/error`，前端调试后删除 |
| `components/ui/` 下手动修改组件 | 通过 `pnpm dlx shadcn@latest add` 添加组件 |
| Provider 层访问数据库 | Provider 层只负责封装三方 SDK/API |
| 手动管理 token/auth | 使用 `middleware/auth.ts` 的 `authMiddleware` |
| 在 `pnpm-workspace.yaml` 外声明依赖版本 | 统一使用 `catalog:` 字段管理 |
| 设置 `minimumReleaseAge: 0` | 等待时间窗口或指定已过年龄的版本 |

---

## 13. 相关文件速查（路径均相对于项目根目录）

**项目配置**
- `pnpm-workspace.yaml` — catalog 版本管理

**规则文档**
- `.trae/rules/project.md` — 项目通用规范
- `.trae/rules/frontend.md` — 前端开发规范
- `.trae/rules/backend.md` — 后端开发规范
- `.trae/rules/local.md` — 本地环境（Windows）规范

**技能文档**
- `.trae/skills/domain-manager-backend/SKILL.md` — 后端开发实操指南
- `.trae/skills/domain-manager-frontend/SKILL.md` — 前端开发实操指南
- `.trae/skills/domain-manager-dev/SKILL.md` — 开发流程 / 命令速查
- `.trae/skills/domain-manager-debug/SKILL.md` — 问题排查 / 快速修复
- `.trae/skills/domain-manager-review/SKILL.md` — 代码审查 / 提交前自检

**后端核心**
- `packages/server/src/index.ts` — 后端入口（路由注册 + 中间件 + 启动）
- `packages/server/src/prisma/schema.prisma` — Prisma schema（10 个模型）
- `packages/server/src/prisma/seed.ts` — 种子数据
- `packages/server/src/prisma/cleanup.ts` — 脏数据清理脚本
- `packages/server/src/middleware/auth.ts` — JWT 鉴权中间件
- `packages/server/src/utils/response.ts` — 统一 API 响应格式工具
- `packages/server/src/utils/logger.ts` — Pino logger 封装

**Provider 系统**
- `packages/server/src/providers/base.ts` — Provider 抽象基类 + ProviderFeatures
- `packages/server/src/providers/config.ts` — 内置服务商配置（fields 驱动前端动态表单 + features）
- `packages/server/src/providers/index.ts` — Provider 聚合导出（DNSProviderFactory）
- `packages/server/src/services/providerService.ts` — 服务商业务逻辑（能力校验 + 级联删除 + 同步写 SyncLog）
- `packages/server/src/services/autoRenewService.ts` — 自动续期调度

**同步审计系统（SyncLog）**
- `packages/server/src/models/syncLog.ts` — SyncLog 数据层（CRUD + userId 过滤）
- `packages/server/src/services/syncLogService.ts` — 同步日志业务层（列表/详情查询）
- `packages/server/src/routes/syncLogs.ts` — 同步日志控制器（GET /api/sync-logs, GET /api/sync-logs/:id）
- `packages/client/src/stores/syncLogs.ts` — 同步日志 Zustand store
- `packages/client/src/pages/SyncLogs.tsx` — 同步记录页面（筛选 + 分页 + 详情对话框）

**前端核心**
- `packages/client/src/App.tsx` — 路由 + 布局 + 主题 + Toaster
- `packages/client/src/main.tsx` — 前端入口
- `packages/client/src/lib/api.ts` — Axios 实例（统一鉴权/错误处理）
- `packages/client/src/hooks/useConfirm.tsx` — 确认对话框 Hook
- `packages/client/src/components/Logo.tsx` — 自定义品牌 Logo
- `packages/client/src/components/DatePicker.tsx` — 日期选择器
- `packages/client/src/pages/Login.tsx` — 登录/注册表单
- `packages/client/src/pages/Providers.tsx` — 服务商管理
- `packages/client/src/pages/Domains.tsx` — 域名管理
- `packages/client/src/stores/auth.ts` — 认证状态
- `packages/client/src/stores/theme.ts` — 主题状态
