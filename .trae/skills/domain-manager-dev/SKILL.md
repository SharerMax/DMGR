---
name: "domain-manager-dev"
description: "Development workflow, commands, and API patterns for Domain Manager. Invoke when setting up environment, running dev/build/lint commands, creating API routes, or working with Prisma operations."
---

# Domain Manager Development

pnpm monorepo: `packages/server` (Express+Prisma+SQLite) + `packages/client` (React+Vite+shadcn/ui)

## Commands

```bash
pnpm install --no-frozen-lockfile  # 安装依赖（lockfile 可能不匹配时用此命令）
pnpm update --latest               # 升级所有依赖到范围最新（受 pnpm 默认 minimumReleaseAge 策略保护：新发布的版本在特定时间窗口内不会被采用，以防御供应链攻击）
pnpm dev:server                     # 后端 http://localhost:3001
pnpm dev:client                     # 前端 http://localhost:3000
pnpm build                          # 构建
pnpm lint / pnpm lint:fix           # 检查/修复
pnpm typecheck                      # 类型检查（前后端同时）
```

**依赖管理说明**:
- 依赖版本集中在 `pnpm-workspace.yaml` 的 `catalog` 字段声明，各工作区的 `package.json` 中使用 `"<pkg>": "catalog:"`
- 升级依赖时用 `pnpm update --latest`，它会把 catalog 内版本范围推到 npm 上的最新大版本
- pnpm 默认启用 `minimumReleaseAge` 安全策略：发布时间早于阈值的版本才会被解析为候选。**不要绕过**该策略（如设置为 0 或排除特定包）。如果某个版本因策略被拒，要么等待时间窗口，要么手工在 catalog 中写入稍旧且安全的版本

## Prisma Commands

```bash
cd packages/server
pnpm prisma generate            # 生成 Client（schema 变更后必须执行）
pnpm prisma migrate dev --name <name>  # 创建迁移
pnpm prisma db seed             # 种子数据
pnpm prisma studio              # 数据库 GUI
```

Schema 路径: `packages/server/src/prisma/schema.prisma`（注意不是 `prisma/schema.prisma`）
Client 输出: `./generated`

## API 开发模式

路由文件在 `packages/server/src/routes/`，在 `src/index.ts` 中注册。

**重要：路由层只能调用 services/，禁止直接导入 models/ 或 prisma。**

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, type AuthRequest } from '../middleware/index.js'
import { getUserDomains, createUserDomain } from '../services/domainService.js'
import { sendSuccess, sendError, HTTP_STATUS } from '../utils/response.js'
import { logger } from '../utils/index.js'

const router = Router()

// 列表查询
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const items = await getUserDomains(req.userId!)
    return sendSuccess(res, items)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Get domains error')
    return sendError(res, '获取失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 创建
const createSchema = z.object({ name: z.string(), expiryDate: z.string() })
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const data = createSchema.parse(req.body)
    const item = await createUserDomain(req.userId!, data)
    logger.info({ id: item.id }, 'Domain created')
    return sendSuccess(res, item, '创建成功', HTTP_STATUS.CREATED)
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, '参数错误', 1, HTTP_STATUS.BAD_REQUEST)
    }
    logger.error({ error }, 'Create domain error')
    return sendError(res, '创建失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

// 删除
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const success = await deleteUserDomain(req.userId!, +req.params.id)
    if (!success) {
      return sendError(res, '域名不存在', 1, HTTP_STATUS.NOT_FOUND)
    }
    return res.status(HTTP_STATUS.NO_CONTENT).send()
  }
  catch (error) {
    logger.error({ error }, 'Delete domain error')
    return sendError(res, '删除失败', 1, HTTP_STATUS.INTERNAL_ERROR)
  }
})

export default router
```

注册: `app.use('/api/new', newRoutes)` (在 index.ts 中)

## Prisma 查询模式

```typescript
import { prisma } from '../db/index.js'

// 基础 CRUD
await prisma.domain.findMany({ where: { userId }, include: { provider: true } })
await prisma.domain.create({ data: { ...input, userId } })
await prisma.domain.update({ where: { id }, data: input })
await prisma.domain.delete({ where: { id } })

// 关联查询
await prisma.domain.findUnique({
  where: { id },
  include: { provider: true, reminders: true, dnsRecords: true }
})

// 即将过期
await prisma.domain.findMany({
  where: { userId, expiryDate: { lte: new Date(Date.now() + 30*24*60*60*1000) } }
})
```

## 前端 API 调用模式

```typescript
import api from '@/lib/api'

// GET
const res = await api.get<Domain[]>('/domains')
const domains = res.data  // response.data 已自动提取（后端 {code,message,data} → data）

// POST
const res = await api.post<Domain>('/domains', data)
const newDomain = res.data

// 错误处理
try {
  await api.post('/domains', data)
} catch (error: any) {
  alert(error.message || '操作失败')  // error.message 是后端返回的消息
}
```

## 关键约定

1. 只用 `pnpm`，不用 npm/yarn
2. 代码变更后：格式化 → 构建 → 类型检查
3. Server 导入必须用 `.js` 扩展名: `import { x } from './db/index.js'`
4. 配置字段 (Provider.config, NotificationChannel.config) 存 JSON 字符串
5. Schema 变更后必须 `prisma generate` + `prisma migrate dev`
6. **后端统一响应格式**: `{ code, message, data }`，用 `sendSuccess/sendError`
7. **后端统一日志**: 用 `logger` (Pino)，禁止 `console.*`
8. **后端认证**: 用 `middleware/auth.ts` 的 `authMiddleware`，挂载 `req.userId`
9. **分层架构**: routes → services → models → db/prisma，禁止跨层调用
10. **路由层禁止直接导入 models/ 或 prisma**：必须通过 services/ 访问数据
11. **providers 目录按服务商拆分**: 每个服务商一个子目录
12. **components/ui/ 只放 shadcn/ui 组件**: 自定义组件放 components/ 根目录
13. **三方集成**: 域名/DNS 操作会同步到服务商 API，失败不阻塞本地操作，仅记录 warn
14. **Renew 实现下沉**: 续期逻辑在 `providers/<name>/renewer.ts`，`autoRenewService.ts` 只做调度
15. **DNSProviderFactory**: 统一创建 provider/syncer/renewer 实例，禁止手动 switch/case
16. **依赖版本集中管理**: 依赖版本写在 `pnpm-workspace.yaml` 的 `catalog` 字段；各 workspace 用 `"catalog:"` 引用。升级时用 `pnpm update --latest`；不要绕过 `minimumReleaseAge` 策略

## 环境变量

- `PORT`: 3001 (默认)
- `JWT_SECRET`: JWT 密钥（生产必须设置）
- `RENEWAL_CRON_EXPRESSION`: 自动续期 cron（默认 `0 2 * * *`）
- `LOG_LEVEL`: 日志级别（默认 `info`）

## 测试账号

- 用户名: `admin` / 密码: `password123`
- 邮箱: `admin@example.com` / 密码: `password123`（也支持邮箱登录）
