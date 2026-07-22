# 后端开发规范

> 适用于 `packages/server/` 下的所有代码。核心技术栈：Express.js 5.2 + TypeScript + Zod 4.4 + Pino 10.3 + Prisma + SQLite。
> 本文件为**声明式规则**（「必须 / 禁止」），不含代码模板。模板见 `skills/domain-manager-backend`。

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

## 2. 分层架构（强制执行，本表为唯一来源）

**严格的单向调用，禁止跨层**：`routes → services → models → prisma`，`services → providers`，`services → notifications`

| 层 | 允许做 | 禁止做 |
|----|--------|--------|
| `routes/`（控制器） | 定义路由、参数校验（Zod）、应用鉴权中间件、调用 service、用 `sendSuccess/sendError` 返回统一响应、记录请求日志 | 直接调用 `models/` 或 `prisma.*`、直接调用三方 API、写业务判断 |
| `services/`（业务层） | 业务逻辑实现、权限校验（`userId` 过滤）、多表协调、事务、调用 `models/` 或 `providers/*/` / `notifications/*/` | 直接构造 HTTP 响应、直接操作 prisma（必须走 models） |
| `providers/<name>/`（适配器） | 封装官方 SDK / HTTP 请求、解析业务响应、暴露领域方法 | 访问数据库、写业务判断、直接调用 prisma |
| `notifications/<channel>/`（通知适配器） | 封装通知渠道 SDK / HTTP 请求、解析业务响应、暴露发送方法 | 访问数据库、写业务判断、直接调用 prisma |
| `models/`（数据层） | 纯 CRUD（`get` / `listByUserId` / `create` / `update` / `delete` 等）、按用户过滤 | 包含业务逻辑、鉴权、调用三方 API |

目录结构详见 `skills/domain-manager-backend` §2。

---

## 3. ES Module 导入规范

- **所有 `import` 语句必须带 `.js` 扩展名**（TypeScript 编译为 ESM，Node.js 要求明确扩展名）
- 使用绝对路径别名 `@/` 从 `src/` 根目录引用，相对路径仅限同一模块内部
- 正确示例：`import { logger } from '@/utils/index.js'`；错误示例：`import { logger } from './utils'`
- **例外**：从 workspace 裸包 `share` 导入类型时**不带扩展名**，且**必须使用 `import type`**（share 是仅类型包，源码直消费，详见 `skills/domain-manager-share`）
  - 正确：`import type { Domain, CreateDomainInput } from 'share'`
  - 错误：`import { Domain } from 'share'`（值导入，会导致运行时找不到模块）
  - 错误：`import type { Domain } from 'share/src/domain.js'`（不应直接穿透到子路径）

---

## 4. 参数校验（Zod）

- 所有 POST / PUT / PATCH 请求的参数**必须**在 `routes/` 层用 Zod schema 校验
- 使用 `z.safeParse()` 而非 `z.parse()`，校验失败返回 `HTTP_STATUS.BAD_REQUEST` 和可读错误信息
- URL 参数（如 `:id`）也必须用 Zod 校验
- schema 定义在 route 层，类型由 Zod 推断
- 用法模板见 `skills/domain-manager-backend` §7

---

## 5. JWT 鉴权中间件

- 所有需要登录的路由**必须**应用 `authMiddleware`（可用 `router.use(authMiddleware)` 批量应用或单独应用）
- JWT 认证逻辑（包括 `JWT_SECRET` 和 `authMiddleware`）集中在 `src/middleware/auth.ts`
- `AuthenticatedRequest` 类型定义：`user?: { userId: number; username: string; email?: string }`
- 业务层必须使用 `req.user.userId` 过滤数据，**用户只能访问自己的数据**
- `userId` 从 JWT token 解析，**不可信任客户端传递的 userId**

---

## 6. 数据层规范（models/*）

- 所有查询/更新/删除**必须**包含 `userId` 过滤
- 使用 `findFirst` / `findFirstOrThrow` / `updateMany` / `deleteMany` 而非 `findUnique` / `update` / `delete`
- 列表查询使用 `findMany({ where: { userId } })`
- 关联查询在 model 层使用 `include` 预先拉取，避免 N+1 查询
- model 层只包含纯 CRUD，**禁止**业务逻辑、鉴权、调用三方 API
- **share 类型衔接**：share 的 `Input`/`Filter` 类型**不含 `userId`**（API 契约层不能信任客户端）。model 函数签名必须用交叉类型扩展：`input: CreateDomainInput & { userId: number }`、`RenewalLogFilters & { userId?: number }`
- **Prisma Date vs share string**：share 实体类型用 `string` 表示日期（JSON wire 格式），后端 Prisma 生成类型用 `Date`。model 层通过 `import type { Domain } from '../prisma/generated/client'` 引用 Prisma 版本作为函数返回类型，并在 model 文件顶部 `export type { Domain } from 'share'` 覆盖（API 响应类型仍以 share 为准）
- 用法模板见 `skills/domain-manager-backend` §8、`skills/domain-manager-share` §3

---

## 7. 数据库操作规范

- Schema 修改流程：修改 `prisma/schema.prisma`（位于 `packages/server/prisma/`，业务无关目录）→ `pnpm prisma migrate dev --name <名称>` → `pnpm prisma generate`（命令详见 `rules/local.md` §3）
- 可空字段正确声明为 `DateTime?` / `String?` 等
- 新字段设置合理的默认值或保持可选
- 删除 Provider 时必须手动级联删除关联域名（事务保证原子性），DB 层为 `SetNull`
- 删除 Domain 时由 DB 层 `onDelete: Cascade` 自动清理 DNSRecord / Reminder / RenewalLog
- 脏数据清理：`pnpm tsx src/prisma/cleanup.ts`
- 数据库模型速查表见 `skills/domain-manager-backend`

---

## 8. ProviderFeatures 能力声明系统（本节为唯一来源）

每个服务商通过 `providers/config.ts` 的 `BUILT_IN_PROVIDERS` 配置声明其能力：

| 字段 | 类型 | 说明 |
|------|------|------|
| `domainSync` | boolean | 支持域名同步（从服务商拉取域名列表） |
| `dnsManagement` | boolean | 支持 DNS 记录管理（增删改查 DNS 记录） |
| `autoRenew` | boolean | 支持自动续期 |

**内建服务商能力矩阵**：

| 服务商 | `domainSync` | `dnsManagement` | `autoRenew` |
|--------|-------------|-----------------|-------------|
| `aliyun` | ✅ | ✅ | ✅ |
| `tencent` | ✅ | ✅ | ✅ |
| `cloudflare` | ✅ | ✅ | ❌ |
| `dnshe` | ✅ | ✅ | ✅ |
| `dnspod` | ✅ | ✅ | ❌ |
| `namecheap` | ✅ | ✅ | ✅ |
| `vps8` | ✅ | ✅ | ❌ |
| `gleam` | ✅ | ✅ | ❌ |

**能力校验规则**：
- service 层执行操作前**必须**校验对应能力字段
- 域名同步前检查 `features.domainSync`
- DNS 管理前检查 `features.dnsManagement`
- 自动续期前检查 `features.autoRenew`
- 能力不匹配时抛出清晰错误消息（如 "该服务商不支持自动续期"）
- 前端根据 `features` 决定是否显示同步按钮、DNS 管理入口

**DNSProviderFactory**：统一通过 `DNSProviderFactory.createProvider` / `createSyncer` / `createRenewer` 创建实例（用法模板见 `skills/domain-manager-backend` §4）

---

## 9. Provider 适配层规范

- `providers/` 目录必须按服务商拆分子目录（`providers/aliyun/`、`providers/tencent/` 等）
- 每个服务商目录只包含 provider 特定代码：`apiClient.ts` / `provider.ts` / `syncer.ts` / `renewer.ts` / `index.ts`
- `BaseApiClient` 已移除，各服务商的 `apiClient.ts` 提供独立 API 接口并对外导出
- Provider 层**禁止**访问数据库、写业务判断
- Provider 的 `config` 字段（JSON 字符串）必须在 service 层做 `JSON.parse()` 解析和验证

---

## 10. Notifications 适配层规范

- `notifications/` 目录必须按通知渠道拆分子目录（`notifications/email/`、`notifications/telegram/`、`notifications/feishu/`、`notifications/webhook/`）
- 每个渠道目录包含 `sender.ts`（实现 `NotificationSender` 接口）和 `index.ts`（导出 + 注册到工厂）
- `notifications/base.ts` 定义 `NotificationSender` 接口、`NotificationType` 类型与 `NotificationSenderFactory` 工厂（唯一来源）
- `notifications/config.ts` 的 `BUILT_IN_NOTIFICATION_CHANNELS` 声明各渠道的字段配置（供前端动态渲染表单）
- `NotificationSender.send(content, type)` 接收 `type` 参数，渠道据此自定义通知内容（如 email 自定义主题、webhook 携带 type 字段）
- Email 渠道的 SMTP 配置通过环境变量读取（`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`，详见 `skills/domain-manager-dev` §7）
- 创建/更新 Email 通知渠道时，service 层**必须**调用 `assertEmailConfigured()` 校验 SMTP 配置，配置缺失时抛出友好错误（前端 `toast.error(error.message)` 提示）
- Notifications 适配层**禁止**访问数据库、写业务判断

---

## 11. 同步审计日志（SyncLog）

- `providerService.syncProviderDomains` 在每次同步完成后**必须**写入 `SyncLog` 记录
- 记录字段包含 `status`（success/failed/partial）、计数（`domainsSynced` / `dnsInserted` / `dnsDeleted`）、`details`（JSON 字符串，含具体变更的域名与 DNS 记录）
- 失败时 `error` 字段记录错误信息
- `SyncLog` 查询必须包含 `userId` 过滤（与其他业务表一致的用户隔离）
- `/api/sync-logs` 接口走 `routes → services → models` 分层，不在 route 层直接操作 prisma

---

## 12. 统一响应格式与日志

统一响应格式见 `rules/project.md` §5。日志规范见 `rules/project.md` §6。

后端登录必须支持用户名和邮箱认证（自动识别 `@` 符号判断类型）。
