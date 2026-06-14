---
name: "domain-manager-review"
description: "Reviews Domain Manager code for quality and best practices. Invoke when user asks for code review, before commits, or wants feedback on code changes."
---

# Domain Manager Code Review

## 审查要点

### 通用
- 无重复代码，函数 < 100 行
- 正确的错误处理，无遗留 console.log
- TypeScript 类型完整，避免 `any`
- 遵循项目 ESLint 规范

### 前端
- React 组件遵循现有模式
- Zustand store 结构合理
- shadcn/ui 组件正确使用（语义色、gap 间距、Card 组合）
- 暗色模式兼容（用 CSS 变量，不用硬编码色值）
- 加载态和错误态已处理
- 表单有验证

### 后端
- Zod 验证所有输入
- 路由使用 `authMiddleware` 保护
- 查询包含 `userId` 过滤（用户只能访问自己的数据）
- 多表操作使用事务
- 无敏感数据泄露到响应

### 安全
- 无硬编码密钥/凭证
- 用户数据隔离（userId 过滤）
- 输入验证（Zod）
- 无 SQL 注入（Prisma 已防护）

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
})

// Bad: 未检查用户权限
router.delete('/:id', async (req, res) => {
  await prisma.item.delete({ where: { id: +req.params.id } })
})

// Good: 验证所有权
const item = await prisma.item.findUnique({ where: { id: +req.params.id } })
if (item?.userId !== req.user!.id) return res.status(403).json({ error: 'Forbidden' })

// Bad: any 类型
const data: any = response.data

// Good: 明确类型
const data: Domain = response.data
```

## 反馈格式

```markdown
## Issue: [标题]
**Problem**: 问题描述
**Location**: 文件:行号
**Suggestion**: 修复建议
**Severity**: Critical/Major/Minor
```
