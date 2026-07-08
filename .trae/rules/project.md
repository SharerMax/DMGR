# 项目核心规范

> 适用于整个 Domain Manager 项目（前后端 + 基础设施）。所有代码变更必须遵循以下规范。

---

## 1. 包管理器与依赖管理

- **唯一使用 `pnpm`**，禁止 `npm` / `yarn` / `bun`
- 依赖版本**集中声明**在 `pnpm-workspace.yaml` 顶层 `catalog:` 字段，按字母序
- 各 workspace 的 `package.json` 以 `"pkg": "catalog:"` 引用
- 升级依赖使用 `pnpm update --latest`（会同时推高 catalog 范围）
- 依赖冲突时执行 `pnpm install --no-frozen-lockfile` 重新解析

### minimumReleaseAge 安全策略

pnpm 默认启用 `minimumReleaseAge`（新发布的包在时间窗口内不会被解析，用于防御供应链攻击）。

- ✅ **允许**：等待时间窗口，或在 catalog 中手动指定稍旧但安全的版本
- ❌ **禁止**：将 `minimumReleaseAge` 设为 0 或排除特定包

---

## 2. 代码提交与版本控制

### 2.1 提交信息规范（Conventional Commits）

提交信息格式：`<type>(<scope>): <subject>`

**type 清单**：

| type | 说明 |
|------|------|
| `feat` | 新增功能 |
| `fix` | 修复 Bug |
| `refactor` | 代码重构（非新增也非修复） |
| `chore` | 杂项（依赖升级、配置变动、脚本更新等） |
| `docs` | 文档变更 |
| `style` | 格式调整（空格、分号、引号等，不含逻辑变动） |
| `test` | 测试相关 |
| `perf` | 性能优化 |
| `build` | 构建系统或 CI 变更 |
| `revert` | 回滚提交 |

**scope 清单**：`server` / `client` / `providers` / `db` / `skills` / `config` 等

示例：

```
feat(server): add domain auto-renew cron scheduler

feat(client): implement provider management page

fix(db): make Domain.expiryDate nullable to prevent null constraint errors

chore(deps): update react-hook-form to v7.81.0
```

### 2.2 提交前质量检查

提交代码前必须完成以下三步：

1. `pnpm lint:fix` — 自动修复风格问题
2. `pnpm lint` — 确认 0 errors
3. `pnpm typecheck` — 前后端类型检查（任一失败不得提交）

---

## 3. 分层架构（核心原则）

```
前端页面 ──► Zustand Store ──► Axios API
                                     │
                                     ▼
                            后端 API (routes/*)
                                     │
                                     ▼
                            业务服务层 (services/*)
                                     │
                                     ▼
            ┌────────────────────┬─────────────────────┐
            ▼                    ▼                     ▼
        数据层(models/*)   服务商适配层(providers/*)   通知系统
            │                    │
            ▼                    ▼
     Prisma + SQLite        三方 SDK / HTTP API
```

**严格的单向调用，禁止跨层**：

| 层 | 允许做 | 禁止做 |
|----|--------|--------|
| `routes/` | 参数校验、鉴权、调用 service、返回统一响应、记录日志 | 直接调用 `models/` 或 prisma、直接调用三方 API |
| `services/` | 业务逻辑、权限校验（userId）、多表协调、事务、调用 models/providers | 直接构造 HTTP 响应、直接操作 prisma |
| `providers/<name>/` | 封装官方 SDK/签名、解析响应、暴露业务方法 | 访问数据库、写业务判断 |
| `models/` | 纯 CRUD 封装 | 包含业务逻辑、鉴权 |

---

## 4. 统一 API 响应格式

所有接口（含鉴权失败、参数错误、业务错误）**必须**返回以下统一格式：

```typescript
{ code: number, message: string, data?: any }
```

- `code === 0` → 成功
- `code !== 0` → 失败，`message` 为用户可读错误信息
- 前端 Axios 拦截器自动提取 `data` 字段

在 `utils/response.ts` 中使用：

```typescript
import { sendSuccess, sendError, HTTP_STATUS } from '../utils/response.js'

sendSuccess(res, data, '操作成功', HTTP_STATUS.CREATED) // 201
sendSuccess(res, data)                                   // 200
sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)   // 400
sendError(res, '未授权', 1, HTTP_STATUS.UNAUTHORIZED)    // 401
sendError(res, '资源不存在', 1, HTTP_STATUS.NOT_FOUND)   // 404
```

---

## 5. 日志规范

- **禁止 `console.log` / `console.error` / `console.warn`**
- 后端统一使用 `Pino logger`（从 `utils/index.js` 导入）
- 前端开发时可使用 `console.log` 调试，但生产提交前必须移除

```typescript
import { logger } from '../utils/index.js'

logger.info({ userId, action }, 'User logged in')
logger.warn({ domain }, 'Domain expiring soon')
logger.error({ error }, 'Operation failed')
```

---

## 6. 目录与文件命名规范

| 规则 | 示例 | 备注 |
|------|------|------|
| 目录一律 `kebab-case` | `notification-channels` / `routes` |
| TypeScript 文件使用 `camelCase.ts` | `domainService.ts` / `useConfirm.tsx` |
| 数据库 schema 与 seed 用 `kebab-case` | `schema.prisma`（在 `src/prisma/`） |
| React 组件使用 `PascalCase.tsx` | `Domains.tsx` / `DatePicker.tsx` |
| 目录按领域拆分 | `providers/aliyun/` / `providers/tencent/` |

---

## 7. TypeScript 规范

- **禁止使用 `any`**，尤其在跨模块接口处。使用 `unknown` + 类型断言，或定义具体类型
- 尽量让类型从代码中自然推导（避免显式声明冗余类型）
- 对象/数组操作优先使用 `as const` 强化字面量类型
- 前后端共享的类型定义需保持一致（Domain / Provider / DNSRecord 等）

---

## 8. 代码风格（ESLint）

- 使用项目根目录的 ESLint 配置（`eslint.config.*`）
- 导入按字母序排序（`perfectionist/sort-imports`）
- 后端导入必须带 `.js` 扩展名
- 使用单引号字符串，无分号
- 每行最大 120 字符（超过时自动换行）
- 对象末尾加逗号（`dangling-comma: 'always' for multiline`）

---

## 9. 安全与凭证管理

- **绝对禁止**在代码中硬编码 JWT 密钥、AccessKey、Token、密码等敏感信息
- 敏感配置通过环境变量读取：
  - `JWT_SECRET` — JWT 签名密钥（生产必须设置）
  - `PORT` — 后端端口（默认 3001）
  - `RENEWAL_CRON_EXPRESSION` — 自动续期 cron（默认 `0 2 * * *`）
  - `LOG_LEVEL` — 日志级别（默认 `info`）
- 用户数据隔离：所有查询必须包含 `userId` 过滤，用户只能访问自己创建的数据
- 密码使用 `bcryptjs` 哈希存储，数据库中字段名为 `password`（非 `passwordHash`）
