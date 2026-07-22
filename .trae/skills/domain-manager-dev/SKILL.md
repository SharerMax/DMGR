# Domain Manager 开发工作流 Skill

> 面向 AI Agent 的项目命令与开发模式速查。涉及日常命令、依赖管理、数据库操作、环境变量等。
> **相关规则**：`rules/local.md`（本地环境与命令）、`rules/project.md`（项目级规则）。本文件只提供操作指南，不重复规则条目。

---

## 1. 代码变更工作流（最小闭环）

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
4. **代码审查**：参考 `skills/domain-manager-review` 的审查清单进行自检
5. **提交**：使用 Conventional Commits 格式（见 `rules/project.md` §3）

---

## 2. 启动开发环境与测试账号

启动命令、测试账号见 `rules/local.md` §3 和 §4。

---

## 3. 代码质量检查与构建

```bash
# 前后端同时检查
pnpm lint          # ESLint 检查（无错误才能提交）
pnpm typecheck     # TypeScript 类型检查（无错误才能提交）

# 后端生产构建（确保生产环境可用）
cd packages/server && pnpm build

# 前端生产构建
cd packages/client && pnpm build
```

---

## 4. 依赖管理（pnpm + catalog）

### 4.1 版本范围声明位置

所有依赖版本集中在**项目根目录的 `pnpm-workspace.yaml`** 的 `catalog:` 字段，按字母序。每个 workspace 的 `package.json` 中以 `"pkg": "catalog:"` 引用。

### 4.2 添加新依赖

```bash
# 给前端 workspace 添加依赖
pnpm --filter client add <package>

# 给后端 workspace 添加依赖
pnpm --filter server add <package>

# 然后在 pnpm-workspace.yaml 中更新 catalog 版本
# 或将新版本推到 catalog: pnpm update --latest
```

### 4.3 升级依赖

```bash
# 升级所有依赖到最新版本（同时更新 catalog 范围）
pnpm update --latest

# 升级特定包
pnpm update <package> --latest
```

### 4.4 重新解析（解决 ERR_PNPM_LOCKFILE_CONFIG_MISMATCH）

```bash
pnpm install --no-frozen-lockfile
```

### 4.5 minimumReleaseAge 策略

pnpm 对新发布的包设置了 "冷静期"。如果某个包因版本太新被挡下，等待时间窗口或在 catalog 中手动指定一个稍旧但安全的版本范围。**不要绕过该策略**（规则见 `rules/project.md` §2）。

---

## 5. 数据库操作（Prisma + SQLite）

```bash
cd packages/server

# 修改 prisma/schema.prisma 后执行：创建并应用迁移
pnpm prisma migrate dev --name <描述性名称>
# 示例: pnpm prisma migrate dev --name add_notes_field_to_domain

# 重新生成 Prisma Client TypeScript 类型
pnpm prisma generate

# 写入种子数据
pnpm prisma db seed

# 打开数据库可视化工具
pnpm prisma studio

# 清理脏数据（孤立 DNS 记录、无 provider 的域名等）
pnpm tsx src/prisma/cleanup.ts
```

---

## 6. 在主入口挂载路由

后端路由定义模板见 `skills/domain-manager-backend` §3。挂载方式：

```typescript
// packages/server/src/index.ts
import domainRoutes from '@/routes/domains.js'
import syncLogRoutes from '@/routes/syncLogs.js'
app.use('/api/domains', domainRoutes)
app.use('/api/sync-logs', syncLogRoutes)  // 同步审计日志（GET /, GET /:id）
```

---

## 7. 环境变量（唯一来源）

在 `packages/server/` 下创建 `.env` 文件（.gitignore 已排除）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 后端端口 |
| `JWT_SECRET` | `dev-secret-change-me` | JWT 签名密钥（生产必须修改） |
| `RENEWAL_CRON_EXPRESSION` | `0 2 * * *` | 自动续期 cron（默认每天凌晨 2 点） |
| `LOG_LEVEL` | `info` | Pino 日志级别（`debug` / `info` / `warn` / `error`） |
| `DATABASE_URL` | `file:./dev.db` | SQLite 文件路径 |
| `SMTP_HOST` | — | SMTP 服务器地址（Email 通知渠道必填，详见 `rules/backend.md` §10） |
| `SMTP_PORT` | `465` | SMTP 端口（常见：465 SSL / 587 STARTTLS） |
| `SMTP_USER` | — | SMTP 用户名（Email 通知渠道必填） |
| `SMTP_PASS` | — | SMTP 密码 / 授权码（Email 通知渠道必填） |
| `SMTP_FROM` | — | 发件人地址（如 `DMGR <noreply@example.com>`，Email 通知渠道必填） |

前端环境变量在 `packages/client/` 下的 `.env` 文件：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE_URL` | `http://localhost:3001/api` | 后端 API 基础 URL |
