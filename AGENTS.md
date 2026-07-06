# AGENTS.md — Domain Manager 项目指南

> 面向 AI Agent 的项目架构、技术栈与开发规范速查手册。
> 任何人（或 AI）阅读本文件后，都应该能迅速地在此代码库中完成一次高质量的代码变更。

---

## 1. 项目概览

**Domain Manager** — 一个用于集中管理多服务商域名与 DNS 记录的单页应用（SPA）。后端 Express + Prisma (SQLite)，前端 React + Vite + shadcn/ui + Tailwind CSS + Zustand。

- 仓库根目录：`<项目根>`（以下所有路径均相对于项目根目录）
- 技术栈：Node.js `>=22.21`、pnpm `11.9.0`、TypeScript、ESM
- 包管理：**仅使用 pnpm**；依赖版本集中在 `pnpm-workspace.yaml` 的 `catalog` 字段声明，各 workspace 的 `package.json` 中以 `"pkg": "catalog:"` 引用
- Monorepo 结构：`packages/client` + `packages/server`

### 1.1 核心能力

| 能力 | 说明 |
|------|------|
| 多服务商域名管理 | 接入阿里云 / 腾讯云 / Cloudflare / DNSPod / Namecheap / VPS8 |
| DNS 记录管理 | 每个域名下增删改查各类 DNS 记录 |
| 自动续期调度 | 由 `autoRenewService.ts` 按 cron 表达式定时执行续期任务 |
| 通知渠道 | 配置通知渠道，用于域名过期、续期结果等消息推送 |

### 1.2 启动与常用命令

```bash
# 依赖安装
pnpm install --no-frozen-lockfile

# 启动开发服务器
pnpm dev:server   # 后端：http://localhost:3001
pnpm dev:client   # 前端：http://localhost:3000

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
```

### 1.3 测试账号

- 用户名：`admin`，密码：`password123`
- 邮箱：`admin@example.com`，密码：`password123`

---

## 2. 目录结构

```
DMGR/
├── .trae/
│   ├── documents/            # 历史技术方案（不随代码自动更新，仅作参考）
│   ├── rules/                # 项目规则（project / frontend / backend / local）
│   └── skills/               # 项目技能（Agent 应优先加载 domain-manager-* 技能）
├── packages/
│   ├── client/               # 前端 (React + Vite + shadcn/ui + Zustand)
│   │   └── src/
│   │       ├── components/   # UI 组件（ui/ 目录仅存 shadcn CLI 组件，不手动修改）
│   │       ├── hooks/        # 自定义 Hooks
│   │       ├── lib/          # api.ts（Axios 实例）、utils.ts（cn 等）
│   │       ├── pages/        # 页面组件（按路由命名）
│   │       ├── stores/       # Zustand 状态管理（按领域拆分）
│   │       ├── App.tsx       # 路由 + 布局 + 主题包裹
│   │       └── main.tsx
│   └── server/               # 后端 (Express 5 + Prisma + SQLite)
│       └── src/
│           ├── db/           # Prisma Client 初始化（index.ts）
│           ├── middleware/   # auth.ts（JWT 鉴权）、index.ts（导出聚合）
│           ├── models/       # 纯 CRUD 封装层（无业务逻辑）
│           ├── prisma/       # schema.prisma + seed.ts + migrations/ + generated/
│           ├── providers/    # DNS 服务商适配层（按服务商拆分子目录）
│           │   ├── base.ts   # DNSProvider / DomainSyncer / DomainRenewer 抽象基类
│           │   ├── config.ts # 内置服务商配置（fields 驱动前端动态表单）
│           │   ├── aliyun/ tencent/ cloudflare/ dnspod/ namecheap/ vps8/
│           │   │   ├── apiClient.ts   # 封装该服务商的官方 SDK / HTTP 调用
│           │   │   ├── provider.ts    # 继承 DNSProvider
│           │   │   ├── syncer.ts      # 继承 DomainSyncer
│           │   │   ├── renewer.ts     # 继承 DomainRenewer（可选，仅支持自动续期的服务商）
│           │   │   └── index.ts       # 注册到 DNSProviderFactory
│           │   └── index.ts  # 统一导出（按字母序，符合 perfectionist/sort-exports）
│           ├── routes/       # 控制器层：仅做参数校验、调用 service、返回响应
│           ├── services/     # 业务服务层：业务逻辑 + 权限校验 + 多表协调
│           ├── utils/        # logger.ts（Pino）、requestLogger.ts、response.ts、index.ts
│           └── index.ts      # 服务器入口（路由注册 + 中间件 + 启动）
├── pnpm-workspace.yaml       # catalog 依赖版本声明
├── skills-lock.json          # 项目技能锁定文件（由 skill CLI 管理）
├── .gitignore
├── .gitattributes
└── package.json              # 根 workspace：pnpm typecheck / lint 等聚合脚本
```

---

## 3. 分层架构与调用链

```
前端 React 页面
     │
     ▼
  Zustand Store ──► lib/api.ts (Axios, JWT) ──────► 后端 API
                                               (HTTP + JSON, code/message/data 统一响应)
                                                          │
                                                          ▼
                                                   routes/* (控制器层)
                                                          │
                                                          ▼
                                                   services/* (业务层) ─► providers/* (三方 SDK 适配)
                                                          │
                                                          ▼
                                                   models/* (数据层，纯 CRUD)
                                                          │
                                                          ▼
                                                   db/index.ts (Prisma Client) ─► SQLite
```

**分层职责要点（不要破坏）：**

| 层 | 可以做 | 禁止做 |
|----|--------|--------|
| `routes/` | 参数校验（Zod）、authMiddleware、调用 service、用 `sendSuccess/sendError` 包装响应 | 直接调用 `models/` 或 `prisma.*`、直接调用三方 API |
| `services/` | 业务逻辑、权限校验（userId 过滤）、多表协调、调用三方 provider | 直接构造 HTTP 响应、直接操作 prisma（要走 models） |
| `providers/<name>/` | 封装官方 SDK / 签名算法 / HTTP 请求、解析业务响应、暴露领域方法 | 访问数据库、写业务判断 |
| `models/` | 纯 CRUD（`get`/`create`/`update`/`delete`/`listByUserId` 等） | 包含业务逻辑、鉴权 |

**关键导入规则**

- 后端统一使用 ESM `import`，**必须带上 `.js` 扩展名**
- logger 用 `pino`：`import logger from '@/utils/logger.js'`，**禁止使用 `console.log` / `console.error`**
- JWT 认证逻辑集中在 `src/middleware/auth.ts`，包括 `JWT_SECRET` 读取、`authMiddleware`、`verifyToken`、`generateToken`
- API 响应统一格式：`{ code: number, message: string, data?: any }`
  - `code === 0` 表示成功
  - 由 `utils/response.ts` 提供 `sendSuccess(res, data, message?)` 和 `sendError(res, message, code?, status?)`

---

## 4. DNS Provider 系统

### 4.1 服务商列表

| 代码名称 | SDK / 客户端 | 认证方式 | provider / syncer / renewer |
|----------|-------------|---------|----------------------------|
| `aliyun` | `@alicloud/pop-core` | AccessKeyId / AccessKeySecret（签名由 SDK 内部处理） | ✔ provider / ✔ syncer / ✔ renewer |
| `tencent` | `tencentcloud-sdk-nodejs-dnspod` + `tencentcloud-sdk-nodejs-domain` | SecretId / SecretKey（TC3-HMAC-SHA256） | ✔ provider / ✔ syncer / ✔ renewer |
| `cloudflare` | `cloudflare`（官方 TS SDK） | API Token（Bearer） | ✔ provider / ✔ syncer |
| `dnspod` | `fetch` + 表单 POST | Login Token（`ID,Token`） | ✔ provider / ✔ syncer |
| `namecheap` | `fast-xml-parser` + `fetch` | ApiUser / ApiKey / ClientIp（HMAC-SHA1 签名） | ✔ provider / ✔ syncer / ✔ renewer |
| `vps8` | `fetch` | Basic Auth（base64(username:password)） | ✔ provider / ✔ syncer |

**不再存在 `BaseApiClient` 抽象基类**。每个服务商的 `apiClient.ts` 直接封装该服务商 SDK，并在内部暴露业务化的方法（如 `describeRecordList`、`createRecord`、`renewDomain` 等）。

### 4.2 DNSProviderFactory

统一通过工厂创建实例：

```typescript
import { DNSProviderFactory } from '../providers/index.js'

const dns = DNSProviderFactory.createProvider('aliyun', { accessKeyId, accessKeySecret })
const syncer = DNSProviderFactory.createSyncer('aliyun', { accessKeyId, accessKeySecret })
const renewer = DNSProviderFactory.createRenewer('aliyun', { accessKeyId, accessKeySecret })
```

添加新服务商的步骤：

1. 在 `providers/<name>/` 下创建 `apiClient.ts` / `provider.ts` / `syncer.ts` /（可选）`renewer.ts` / `index.ts`
2. 在 `providers/config.ts` 的 `BUILT_IN_PROVIDERS` 中追加配置（`fields` 驱动前端动态表单）
3. 在 `providers/index.ts` 中 `import './<name>/index.js'` 触发注册

### 4.3 自动续期调度

- 配置项：`RENEWAL_CRON_EXPRESSION`（默认 `0 2 * * *`，每天凌晨 2 点）
- 调度器：`services/autoRenewService.ts` → `node-cron`
- 实际续期逻辑下沉至各服务商的 `providers/<name>/renewer.ts`
- 续期结果写入 `renewalLogs` 表（`models/renewalLog.ts`）

---

## 5. 前端开发规范

### 5.1 UI 组件

- **`components/ui/` 目录仅存放 shadcn/ui CLI 生成的标准组件**，不要手动修改；修改会被后续 `pnpm dlx shadcn@latest add` 覆盖
- 使用官方 `pnpm dlx shadcn@latest add <component>` 添加组件
- 自定义业务组件放在 `components/` 根目录（例如 `DatePicker.tsx`、`Pagination.tsx`、`DomainFilter.tsx`）
- UI 风格使用 `shadcn/ui` 的 `Vega` 样式

### 5.2 状态管理（Zustand）

每个领域一个 store：`auth` / `domains` / `providers` / `dnsRecords` / `notificationChannels` / `renewalLogs` / `theme`。

store 中通过 `@/lib/api.ts` 发起 HTTP 请求，错误时用 `alert(error.message)` 提示用户（后端返回的 `message` 字段）。

### 5.3 API 交互

`lib/api.ts` 暴露 Axios 实例，统一约定：

- 请求头自动附带 `Authorization: Bearer <token>`（从 `auth` store 获取）
- 401 响应自动跳转 `/login` 并清除本地 token
- 成功响应自动提取 `res.data.data`
- 失败时 `error.message` 即为后端返回的 `message`

页面中的模式：

```typescript
import api from '@/lib/api'

// GET
const res = await api.get<Domain[]>('/domains')
const domains = res.data.data

// POST
const res = await api.post<Domain>('/domains', payload)
const newDomain = res.data.data
```

### 5.4 主题与暗色模式

由 `stores/theme.ts` 管理 `'light' | 'dark' | 'system'`。
通过在 `<html>` 切换 `.dark` class 生效（Tailwind CSS v4 配合 `tw-animate-css`）。

---

## 6. 依赖管理与安全

### 6.1 catalog 与版本管理

- 依赖版本集中写在 `pnpm-workspace.yaml` 顶层 `catalog:` 字段
- 各 workspace `package.json` 以 `"pkg": "catalog:"` 引用
- 升级依赖使用 `pnpm update --latest`，这会同时推高 catalog 中的版本范围并写入 lockfile

### 6.2 minimumReleaseAge 安全策略

pnpm 默认启用 `minimumReleaseAge`（新发布的包在一段时间内不会被解析，用于防御供应链攻击）。

- **不要绕过**该策略（例如不要设置 `minimumReleaseAge: 0` 或添加排除项）
- 如果某个包被策略挡下且确实需要新版本，可在 `pnpm-workspace.yaml` 中 `catalog:` 显式指定一个已过最小发布年龄的版本范围

### 6.3 更新第三方 skills

- 项目技能锁定文件：`skills-lock.json`（由 skill CLI 管理，git 纳入版本控制）
- 自定义项目技能存放在 `.trae/skills/domain-manager-*/SKILL.md`，文件名需以 `domain-manager-` 开头
- 当远端技能内容变化时，需要执行 `pnpm dlx skills@latest sync` 或类似命令同步 hash

---

## 7. 数据库 (Prisma + SQLite)

- Schema 文件：`packages/server/src/prisma/schema.prisma`
- Generated Client：`packages/server/src/prisma/generated/`（由 `prisma generate` 输出，被 `.gitignore` 的部分除外）
- SQLite 数据库文件位置：由 Prisma 配置决定，默认在 `packages/server/src/prisma/dev.db`
- 种子数据：`packages/server/src/prisma/seed.ts`（包含管理员用户 `admin` / `password123`）

**关键数据模型**

| Model | 作用 | 关键字段 |
|-------|------|---------|
| `User` | 用户 | `username`, `email`, `passwordHash` |
| `Provider` | 服务商配置 | `type`（aliyun/tencent/cloudflare/dnspod/namecheap/vps8）、`config`（JSON 字符串，包含 apiKey/secret/token 等）、`supportsAutoRenew` |
| `Domain` | 域名 | `name`, `providerId`, `expiryDate`, `autoRenew`, `autoRenewDays`, `status` |
| `DNSRecord` | DNS 记录 | `domainId`, `type`, `name`, `value`, `ttl`, `priority`, `providerRecordId` |
| `NotificationChannel` | 通知渠道 | `type`（email/webhook 等）、`config`（JSON 字符串）、`defaultDays` |
| `RenewalLog` | 续期日志 | `domainId`, `status`, `message`, `providerResponse`（JSON） |
| `Reminder` | 提醒 | `domainId`, `daysBefore`, `sentAt` |

**修改 schema 后的流程**

```bash
cd packages/server
pnpm prisma migrate dev --name <descriptive-name>   # 生成 + 应用迁移
pnpm prisma generate                                  # 重新生成 Prisma Client TypeScript 类型
# 必要时 pnpm prisma db seed
```

---

## 8. 代码质量与提交规范

### 8.1 代码格式化与检查

在提交代码之前：

1. **代码风格**：`pnpm lint`；可自动修复的用 `pnpm lint:fix`
2. **类型检查**：`pnpm typecheck`（先后端再前端，任一失败需修复）
3. **后端构建**：如改动涉及后端，运行 `pnpm build` 确保生产构建通过

如果 lint 失败但 `--fix` 无法修复，需要手动按以下原则修正：

- 不要使用 `any`，尤其在跨文件接口处；使用泛型或 `unknown` + 类型断言
- React 组件中避免多余的 state（如可由其他 state 推导出来的），遵循 `set-state-in-effect` 原则
- 字符串比较、日期处理优先使用 `date-fns` 或原生 `Intl`，避免 moment

### 8.2 Git 提交信息（Conventional Commits）

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

常用 type：

| type | 含义 |
|------|------|
| `feat` | 新增功能 |
| `fix` | 修复 Bug |
| `refactor` | 代码重构（非新功能 / 非修复） |
| `chore` | 杂项（依赖升级、配置改动、脚本更新） |
| `docs` | 文档 |
| `style` | 格式（非逻辑改动，如空格、分号、引号） |
| `test` | 测试 |
| `perf` | 性能优化 |
| `build` | 构建系统或 CI |

scope 建议：`server` / `client` / `providers` / `db` / `skills` 等。

示例：

```
feat(server): add domain auto-renew cron scheduler

- 由 node-cron 按环境变量 RENEWAL_CRON_EXPRESSION 定时触发
- 每个支持自动续期的 provider 依次执行 renewer 并写入 renewal_logs
- JWT 过期时 authMiddleware 自动拒绝请求，前端跳转登录
```

### 8.3 文件命名与导出顺序

- 目录、文件一律 `kebab-case` 或 `snake_case`（TypeScript 源文件使用 `camelCase` 文件名更常见，但本项目使用 `camelCase.ts`）
- `pnpm-workspace.yaml` 的 `catalog:` 字段按字母序
- `providers/index.ts` 的导出按字母序（符合 `perfectionist/sort-exports`）

---

## 9. 调试与问题排查速查

### 9.1 常见问题

| 现象 | 排查方向 |
|------|---------|
| 前端页面白屏 / 控制台报错 401 | 检查 `auth` store 的 token 是否过期、`JWT_SECRET` 是否一致 |
| 后端 `Prisma Client could not be found` | 执行 `pnpm prisma generate` |
| 域名同步不到三方数据 | 检查 provider 的 `config` JSON 字段是否正确，再查 Pino 日志 |
| 三方 API 调用失败 | 确认服务商凭证有效，检查 `providers/<name>/apiClient.ts` 的签名参数与版本字段 |
| pnpm install 报 `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` | 运行 `pnpm install --no-frozen-lockfile` 重新解析 |
| 解析到的包版本因 `minimumReleaseAge` 被拒 | 等待时间窗口；或在 `catalog:` 中手动指定一个稍旧但安全的版本 |

### 9.2 日志查看

- 后端 stdout：Pino 结构化日志（可 `pnpm dev:server | pnpm pino-pretty`）
- 请求日志中间件 `utils/requestLogger.ts` 输出 `[timestamp] METHOD path status duration`
- 关键错误通过 `logger.error({ error })` 附带错误字段

---

## 10. 环境变量

在根目录或各 workspace 目录创建 `.env`（.gitignore 已排除）：

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | `3001` | 后端端口 |
| `JWT_SECRET` | `dev-secret-change-me` | JWT 签名密钥（生产必须修改） |
| `RENEWAL_CRON_EXPRESSION` | `0 2 * * *` | 自动续期 cron |
| `LOG_LEVEL` | `info` | Pino 日志级别 |

---

## 11. 推荐的工作流

在你准备执行一次变更时，建议遵循以下最小闭环：

1. **读文档**：先浏览 `.trae/rules/project.md` / `frontend.md` / `backend.md`、以及 `.trae/skills/` 中对应的 `domain-manager-*` 技能文件
2. **实现**：按分层架构实现代码，provider 相关改动必须在 `providers/<name>/` 目录内完成
3. **校验**：
   - `pnpm lint:fix` 自动修复可自动修复的风格问题
   - `pnpm lint` 确认 0 errors
   - `pnpm typecheck` 确认前后端类型无误
   - 后端 `pnpm build` 确认生产构建通过
4. **提交**：使用 conventional commit 提交
5. **如需调整**：通过 `git commit --amend` 或 rebase 保持提交历史干净

---

## 12. 相关文件速查（路径均相对于项目根目录）

- `pnpm-workspace.yaml` — catalog 版本
- `packages/server/package.json` — 后端脚本 + 依赖
- `packages/server/src/index.ts` — 后端入口
- `packages/server/src/prisma/schema.prisma` — Prisma schema
- `packages/server/src/providers/base.ts` — Provider 抽象基类
- `packages/server/src/providers/config.ts` — 内置服务商配置
- `packages/server/src/providers/index.ts` — Provider 聚合导出
- `packages/server/src/middleware/auth.ts` — JWT 鉴权中间件
- `packages/server/src/services/autoRenewService.ts` — 自动续期调度
- `packages/server/src/utils/response.ts` — 统一 API 响应格式
- `packages/client/src/App.tsx` — 前端路由 + 布局
- `packages/client/src/lib/api.ts` — 前端 Axios 实例（统一鉴权/错误处理）
- `.trae/rules/project.md` — 项目规则
- `.trae/rules/frontend.md` — 前端规则
- `.trae/skills/domain-manager-backend/SKILL.md` — 后端开发技能
- `.trae/skills/domain-manager-frontend/SKILL.md` — 前端开发技能
- `.trae/skills/domain-manager-dev/SKILL.md` — 开发流程技能
- `.trae/skills/domain-manager-debug/SKILL.md` — 调试技能
