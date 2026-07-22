# 项目核心规范

> 适用于整个 Domain Manager 项目（前后端 + 基础设施）。所有代码变更必须遵循以下规范。
> 本文件为**声明式规则**（「必须 / 禁止」），不含代码模板。模板见 `skills/` 目录。

---

## 1. 项目核心能力

| 能力 | 说明 |
|------|------|
| 多服务商域名管理 | 阿里云 / 腾讯云 / Cloudflare / DNSHE / DNSPod / Namecheap / VPS8 / Gleam |
| DNS 记录管理 | 每个域名下增删改查各类 DNS 记录 |
| 自动续期调度 | 由 `autoRenewService.ts` 按 cron 表达式定时执行续期任务 |
| 通知渠道 | 配置通知渠道（Email / Telegram / Feishu / Webhook），用于域名过期、续期结果等消息推送 |
| 服务商能力声明 | 通过 `ProviderFeatures` 对象声明各服务商支持的能力 |
| 同步审计 | 通过 `SyncLog` 记录服务商域名同步操作的成功/失败/部分成功状态及变更明细 |

---

## 2. 包管理器与依赖管理

- **唯一使用 `pnpm`**，禁止 `npm` / `yarn` / `bun`
- 依赖版本**集中声明**在 `pnpm-workspace.yaml` 顶层 `catalog:` 字段，按字母序
- 各 workspace 的 `package.json` 以 `"pkg": "catalog:"` 引用
- 升级依赖使用 `pnpm update --latest`（会同时推高 catalog 范围）
- 依赖冲突时执行 `pnpm install --no-frozen-lockfile` 重新解析

### 2.1 Workspace 内部包引用

- Monorepo 包含三个 workspace：`packages/client` / `packages/server` / `packages/share`
- `packages/share` 是**仅类型导出**的共享类型包（API 契约类型，详见 `skills/domain-manager-share`）
- `client` 与 `server` 的 `package.json` 通过 `"share": "workspace:*"` 引用 share 包
- share 包 `exports` 直接指向 `./src/index.ts`，配合 `moduleResolution: bundler` 实现**源码直消费**，无 build 步骤
- 消费方必须使用 `import type { ... } from 'share'`（仅类型导入，编译期擦除，不进入运行时产物）

### minimumReleaseAge 安全策略

pnpm 默认启用 `minimumReleaseAge`（新发布的包在时间窗口内不会被解析，用于防御供应链攻击）。

- ✅ **允许**：等待时间窗口，或在 catalog 中手动指定稍旧但安全的版本
- ❌ **禁止**：将 `minimumReleaseAge` 设为 0 或排除特定包

---

## 3. 代码提交与版本控制

### 3.1 提交信息规范（Conventional Commits）

提交信息格式（提交信息使用英文）：

```
<type>(<scope>): <subject>

[optional body]
```

- **subject**：一句话概括变更（祈使句、现在时，不超过 72 字符）
- **optional body**：空一行后，用 `-` 无序列表逐条说明具体变更点；非简单单行提交时**必须**填写 body

**type 清单**：`feat` / `fix` / `refactor` / `chore` / `docs` / `style` / `test` / `perf` / `build` / `revert`

**scope 清单**：`server` / `client` / `providers` / `db` / `skills` / `config` 等

**示例**：

```
feat(server): add notifications module with email and webhook senders

- Add notifications/ directory split by channel (email/feishu/telegram/webhook)
- Implement EmailSender via nodemailer with SMTP env config
- Implement WebhookSender via fetch HTTP POST
- Refactor notificationService to use NotificationSenderFactory
```

### 3.2 提交前质量检查

提交代码前必须完成：`pnpm lint:fix` → `pnpm lint`（0 errors）→ `pnpm typecheck`（前后端通过）

---

## 4. 分层架构原则

**严格的单向调用，禁止跨层**：`routes → services → models → prisma`，`services → providers`

各层职责的详细规则见 `rules/backend.md` §2，前端调用链见 `rules/frontend.md`。

**类型契约层（`packages/share`）**：跨前后端共享的 API 类型（实体、Input、Filter、Stats 等）必须定义在 share 包中，由前后端各自以 `import type` 消费。share 是**类型唯一来源**，禁止在前后端重复定义同名实体类型。详细约定见 `skills/domain-manager-share`。

---

## 5. 统一 API 响应格式（前后端契约）

所有接口（含鉴权失败、参数错误、业务错误）**必须**返回统一格式：`{ code: number, message: string, data?: any }`

- `code === 0` → 成功
- `code !== 0` → 失败，`message` 为用户可读错误信息
- 前端 Axios 拦截器自动提取 `data` 字段
- 后端通过 `utils/response.ts` 的 `sendSuccess` / `sendError` + `HTTP_STATUS` 常量返回（用法模板见 `skills/domain-manager-backend`）

---

## 6. 日志规范

- **禁止 `console.log` / `console.error` / `console.warn`**
- 后端统一使用 `Pino logger`（从 `utils/index.js` 导入），使用 `logger.info / warn / error`
- 前端开发时可使用 `console.log` 调试，但生产提交前必须移除
- 日志中不得泄露敏感信息（password、secret 字段值）
- 服务商 API 客户端必须用 Pino 记录 API 交互（结构化字段：`provider`、`method`、`path`、`status`、`error`）

---

## 7. 目录与文件命名规范

| 规则 | 示例 |
|------|------|
| 目录一律 `kebab-case` | `notification-channels` / `routes` |
| TypeScript 文件使用 `camelCase.ts` | `domainService.ts` / `useConfirm.tsx` |
| 数据库 schema 与 seed 用 `kebab-case` | `schema.prisma` |
| React 组件使用 `PascalCase.tsx` | `DomainFilter.tsx` / `DatePicker.tsx`（页面入口例外，用 `index.tsx`） |
| 目录按领域拆分 | `providers/aliyun/` / `providers/tencent/` |

---

## 8. TypeScript 规范

- **禁止使用 `any`**，尤其在跨模块接口处。使用 `unknown` + 类型断言，或定义具体类型
- 尽量让类型从代码中自然推导（避免显式声明冗余类型）
- 对象/数组操作优先使用 `as const` 强化字面量类型
- 前后端共享的 API 契约类型（实体 / Input / Filter / Stats 等）**必须定义在 `packages/share`**，由前后端各自 `import type` 消费；禁止在 `client/` 或 `server/` 中重复定义同名类型
- share 包实体类型用 **`string`（ISO 字符串）表示日期**（JSON wire 格式），后端 Prisma 生成的 `Date` 类型仅供内部函数签名使用，需在 model 层通过 re-export 或类型扩展衔接
- share 包是**仅类型包**，禁止在 share 中导出任何运行时值（const、function、class）；运行时常量必须保留在前后端各自代码中

---

## 9. 代码风格（ESLint）

- 使用项目根目录的 ESLint 配置（`eslint.config.*`）
- 导入按字母序排序（`perfectionist/sort-imports`）
- 后端导入必须带 `.js` 扩展名
- 使用单引号字符串，无分号
- 每行最大 120 字符（超过时自动换行）
- 对象末尾加逗号（`dangling-comma: 'always' for multiline`）

---

## 10. 安全与凭证管理

- **绝对禁止**在代码中硬编码 JWT 密钥、AccessKey、Token、密码等敏感信息
- 敏感配置通过环境变量读取（环境变量清单见 `skills/domain-manager-dev`）
- 用户数据隔离：所有查询必须包含 `userId` 过滤，用户只能访问自己创建的数据
- 密码使用 `bcryptjs` 哈希存储，数据库中字段名为 `password`（非 `passwordHash`）

---

## 11. 反模式清单（全局唯一来源）

以下模式在本项目中是**禁止的**（代码示例见 `skills/domain-manager-review` §4）：

| ❌ 禁止 | ✅ 正确做法 |
|--------|------------|
| 后端 import 不带 `.js` 扩展名 | `import { xxx } from '@/utils/index.js'`（**例外**：从 `share` 裸包导入类型时不带扩展名） |
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
| 使用 `react-router-dom` 包 | React Router 8.x，API 从 `react-router` 导入 |
| `@types/node` 升级到 v26+ | 固定 `^22.20.0` |
| 硬编码状态色 `text-red-500` / `bg-green-100` | 使用 `text-status-*` / `bg-status-*-bg` 语义类 |
| 前后端重复定义同一 API 实体类型 | 定义在 `packages/share`，两端 `import type` 消费 |
| 从 `share` 用值导入（非 `import type`） | 一律 `import type { ... } from 'share'`（仅类型导出） |
| 在 `share` 中导出 const / function / class | 运行时常量保留在前后端各自代码中 |
