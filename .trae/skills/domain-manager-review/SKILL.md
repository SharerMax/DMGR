---
name: "domain-manager-review"
description: "Reviews Domain Manager code for quality and best practices. Invoke when user asks for code review, before commits, or wants feedback on code changes."
---

# Domain Manager Code Review

## 审查要点

### 通用
- 无重复代码，函数 < 100 行
- 正确的错误处理，**无遗留 console.log/console.error**
- TypeScript 类型完整，避免 `any`
- 遵循项目 ESLint 规范
- 无硬编码密钥/凭证

### 前端
- React 组件遵循现有模式
- Zustand store 结构合理
- shadcn/ui 组件正确使用（语义色、gap 间距、Card 组合）
- 暗色模式兼容（用 CSS 变量，不用硬编码色值）
- 加载态和错误态已处理
- 表单有验证
- API 调用错误消息用 `error.message`（不是 `error.response?.data?.error`）
- `components/ui/` 只包含 shadcn/ui CLI 添加的组件

### 后端
- Zod 验证所有输入
- 路由使用 `middleware/auth.ts` 的 `authMiddleware` 保护
- 查询包含 `userId` 过滤（用户只能访问自己的数据）
- 多表操作使用事务
- 无敏感数据泄露到响应
- **统一响应格式**: 使用 `sendSuccess/sendError`，返回 `{ code, message, data }`
- **统一日志**: 使用 `logger` (Pino)，禁止 `console.log/error/warn`
- 导入使用 `.js` 扩展名
- `providers/` 按服务商拆分目录，每个服务商一个子目录
- **分层架构**: routes → services → models → db/prisma
- **禁止跨层调用**: 路由层禁止直接导入 models/ 或 prisma
- **禁止在 service 层直接处理 HTTP 响应**: service 抛 Error，路由层 catch 转换
- **三方集成**: 域名/DNS 记录操作需同步服务商 API，service 层协调
- **Renew 下沉**: 续期逻辑必须在 providers/ 层实现，autoRenew.ts 只做调度
- **DNSProviderFactory**: 统一创建实例，禁止手动 switch/case 判断服务商类型

### 安全
- 无硬编码密钥/凭证
- 用户数据隔离（userId 过滤）
- 输入验证（Zod）
- 无 SQL 注入（Prisma 已防护）
- JWT 密钥从环境变量读取

## 常见问题

```typescript
// Bad: 缺少验证
router.post('/', async (req, res) => {
  const item = await prisma.item.create({ data: req.body })
})

// Good: Zod 验证
const schema = z.object({ name: z.string() })
router.post('/', async (req, res) => {
  const data = schema.parse(req.body)
  const item = await prisma.item.create({ data })
  sendSuccess(res, item)
})

// Bad: 未检查用户权限
router.delete('/:id', async (req, res) => {
  await prisma.item.delete({ where: { id: +req.params.id } })
})

// Good: 验证所有权
const item = await prisma.item.findUnique({ where: { id: +req.params.id } })
if (item?.userId !== req.userId) return sendError(res, '无权限', 1, HTTP_STATUS.FORBIDDEN)

// Bad: any 类型
const data: any = response.data

// Good: 明确类型
const data: Domain = response.data

// Bad: console.log
console.log('User logged in:', userId)

// Good: Pino logger
logger.info({ userId }, 'User logged in')

// Bad: 直接返回数据
res.json(domains)

// Good: 统一响应格式
sendSuccess(res, domains)

// Bad: 错误消息获取方式
catch (error: any) {
  alert(error.response?.data?.error || '操作失败')
}

// Good: 使用拦截器处理后的 error.message
catch (error: any) {
  alert(error.message || '操作失败')
}

// Bad: 路由层直接调用 prisma
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const domains = await prisma.domain.findMany({ where: { userId: req.userId! } })
  sendSuccess(res, domains)
})

// Good: 路由层调用 service
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const domains = await getUserDomains(req.userId!)
  sendSuccess(res, domains)
})

// Bad: 路由层直接导入 models
import { getDomainsByUserId } from '../models/domain.js'

// Good: 路由层导入 services
import { getUserDomains } from '../services/domainService.js'

// Bad: service 层直接处理 HTTP 响应
export async function getDomains(res, userId) {
  const domains = await getDomainsByUserId(userId)
  res.json(domains)
}

// Good: service 层返回数据，抛错误
export async function getUserDomains(userId) {
  const domains = await getDomainsByUserId(userId)
  return domains
}
```

## 目录规范检查

- `components/ui/` 只包含 shadcn/ui 组件
- 自定义组件在 `components/` 根目录
- `providers/` 按服务商拆分目录
- `middleware/` 存放中间件
- `utils/` 存放工具函数
- `services/` 存放业务服务（每个领域一个 `xxxService.ts`）
- `models/` 存放数据访问层（纯 CRUD，无业务逻辑）
- `routes/` 只调用 `services/`，不直接调用 `models/` 或 prisma

## 反馈格式

```markdown
## Issue: [标题]
**Problem**: 问题描述
**Location**: 文件:行号
**Suggestion**: 修复建议
**Severity**: Critical/Major/Minor
```
