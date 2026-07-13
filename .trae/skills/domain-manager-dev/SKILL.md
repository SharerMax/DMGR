# Domain Manager 开发工作流 Skill

> 面向 AI Agent 的项目命令与开发模式速查。涉及前后端的日常命令、依赖管理、数据库操作、API 约定等。

---

## 1. 启动开发环境

```bash
# 同时启动前后端（推荐，使用 npm-run-all）
pnpm dev

# 单独启动
pnpm dev:server   # 后端 API: http://localhost:3001
pnpm dev:client   # 前端 SPA: http://localhost:3000
```

---

## 2. 测试账号

首次启动后执行数据库迁移和种子数据：

```bash
# 迁移（如已迁移可跳过）
cd packages/server
pnpm prisma migrate dev

# 写入种子数据（创建管理员账号）
pnpm prisma db seed
```

**账号**：
- 用户名：`admin`
- 密码：`password123`
- 邮箱：`admin@example.com`

---

## 3. 代码质量检查（提交前必须执行）

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

pnpm 对新发布的包设置了 "冷静期"。如果某个包因版本太新被挡下，等待时间窗口或在 catalog 中手动指定一个稍旧但安全的版本范围。**不要绕过该策略**。

---

## 5. 数据库操作（Prisma + SQLite）

```bash
cd packages/server

# 修改 schema.prisma 后执行：创建并应用迁移
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

## 6. 后端 API 开发模式

### 6.1 统一响应格式

所有接口必须返回：

```typescript
{ code: number, message: string, data?: any }
// code === 0 表示成功
// code !== 0 表示失败
```

### 6.2 路由定义模板

```typescript
// packages/server/src/routes/domains.ts
import { Router } from 'express'
import { sendSuccess, sendError, HTTP_STATUS } from '@/utils/response.js'
import { z } from 'zod'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/index.js'
import { domainService } from '@/services/domainService.js'

const router = Router()
router.use(authMiddleware)

const createSchema = z.object({
  name: z.string().min(1, '域名不能为空').max(255, '域名过长'),
  providerId: z.coerce.number().int().positive().nullable().optional(),
})

router.post('/', async (req: AuthenticatedRequest, res) => {
  const parse = createSchema.safeParse(req.body)
  if (!parse.success) {
    const messages = parse.error.issues.map((i) => i.message).join('; ')
    sendError(res, messages, 1, HTTP_STATUS.BAD_REQUEST)
    return
  }
  try {
    const result = await domainService.createDomain(req.user!.userId, parse.data)
    sendSuccess(res, result, '创建成功', HTTP_STATUS.CREATED)
  } catch (error: any) {
    sendError(res, error.message || '创建失败', 1, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
})

export default router
```

### 6.3 在主入口挂载路由

```typescript
// packages/server/src/index.ts
import domainRoutes from '@/routes/domains.js'
import syncLogRoutes from '@/routes/syncLogs.js'
app.use('/api/domains', domainRoutes)
app.use('/api/sync-logs', syncLogRoutes)  // 同步审计日志（GET /, GET /:id）
```

---

## 7. 前端 API 调用模式

前端 Axios 实例已在 `lib/api.ts` 中封装了以下约定：

- 自动附带 `Authorization: Bearer <token>`（从 `auth` store 获取）
- 401 响应自动跳转 `/login` 并清除本地 token
- 成功响应自动提取 `res.data.data`
- 错误时 `error.message` 即为后端返回的可读消息

```typescript
import api from '@/lib/api'

// GET
const res = await api.get<Domain[]>('/domains')
const domains = res.data

// POST
const res = await api.post<Domain>('/domains', payload)
const newDomain = res.data

// PUT
await api.put<Domain>(`/domains/${id}`, payload)

// DELETE
await api.delete(`/domains/${id}`)

// 带查询参数
const res = await api.get<Domain[]>('/domains', {
  params: { providerId, status },
})
```

---

## 8. Provider 能力检查约定

服务商的能力由后端 `providers/config.ts` 的 `BUILT_IN_PROVIDERS` 声明：

```typescript
interface ProviderFeatures {
  domainSync: boolean
  dnsManagement: boolean
  autoRenew: boolean
}
```

**在 service 层的操作前必须校验能力**：

```typescript
import { BUILT_IN_PROVIDERS } from '@/providers/config.js'

const builtin = BUILT_IN_PROVIDERS[provider.type]
if (!builtin?.features.domainSync) {
  throw new Error('该服务商不支持域名同步')
}
```

---

## 9. 环境变量

在 `packages/server/` 下创建 `.env` 文件（.gitignore 已排除）：

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | `3001` | 后端端口 |
| `JWT_SECRET` | `dev-secret-change-me` | JWT 签名密钥（生产必须修改） |
| `RENEWAL_CRON_EXPRESSION` | `0 2 * * *` | 自动续期 cron（默认每天凌晨 2 点） |
| `LOG_LEVEL` | `info` | Pino 日志级别（`debug` / `info` / `warn` / `error`） |
| `DATABASE_URL` | `file:./dev.db` | SQLite 文件路径 |

前端环境变量在 `packages/client/` 下的 `.env` 文件：

| 变量 | 默认 | 说明 |
|------|------|------|
| `VITE_API_BASE_URL` | `http://localhost:3001/api` | 后端 API 基础 URL |

---

## 10. 快速反模式检查清单

- ✅ `pnpm install --no-frozen-lockfile` 无报错
- ✅ `pnpm lint` 无错误
- ✅ `pnpm typecheck` 前后端无类型错误
- ✅ 后端 `pnpm build` 成功
- ✅ 前端 `pnpm build` 成功
- ✅ 所有路由的 POST/PUT 请求使用 Zod 参数校验
- ✅ 所有查询包含 userId 过滤（用户数据隔离）
- ✅ 前端表单使用 react-hook-form + toast 反馈
- ✅ 删除等危险操作使用 useConfirm 对话框
- ✅ Provider 操作前校验 ProviderFeatures 能力
- ✅ 没有硬编码的 API URL / Token / 密钥
- ✅ 没有 `console.log` / `console.error` / `alert()` 遗留在生产代码
