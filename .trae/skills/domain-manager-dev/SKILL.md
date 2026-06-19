---
name: "domain-manager-dev"
description: "Development workflow, commands, and API patterns for Domain Manager. Invoke when setting up environment, running dev/build/lint commands, creating API routes, or working with Prisma operations."
---

# Domain Manager Development

pnpm monorepo: `packages/server` (Express+Prisma+SQLite) + `packages/client` (React+Vite+shadcn/ui)

## Commands

```bash
pnpm install                    # 安装依赖
pnpm dev:server                 # 后端 http://localhost:3001
pnpm dev:client                 # 前端 http://localhost:3000
pnpm build                      # 构建
pnpm lint / pnpm lint:fix       # 检查/修复
pnpm --filter server exec tsc --noEmit  # 后端类型检查
pnpm --filter client exec tsc --noEmit  # 前端类型检查
```

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

```typescript
import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../models/user.js'
import { prisma } from '../db/index.js'

const router = Router()

// 受保护路由
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user!.id
  const items = await prisma.domain.findMany({ where: { userId } })
  res.json(items)
})

// 带验证的创建
router.post('/', authMiddleware, async (req, res) => {
  const schema = z.object({ name: z.string(), expiryDate: z.string() })
  const data = schema.parse(req.body)
  const item = await prisma.domain.create({ data: { ...data, userId: req.user!.id } })
  res.json(item)
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

## 关键约定

1. 只用 `pnpm`，不用 npm/yarn
2. 代码变更后：格式化 → 构建 → 类型检查
3. Server 导入必须用 `.js` 扩展名: `import { x } from './db/index.js'`
4. 配置字段 (Provider.config, NotificationChannel.config) 存 JSON 字符串
5. Schema 变更后必须 `prisma generate` + `prisma migrate dev`

## 环境变量

- `PORT`: 3001 (默认)
- `JWT_SECRET`: JWT 密钥（生产必须设置）
- `RENEWAL_CRON_EXPRESSION`: 自动续期 cron（默认 `0 2 * * *`）

## 测试账号

- 用户名: `admin` / 密码: `password123`
