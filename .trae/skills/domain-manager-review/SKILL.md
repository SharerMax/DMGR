# Domain Manager 代码审查 Skill

> 面向 AI Agent 的代码审查清单与标准。用于在提交代码前自我审查，或评审他人的改动。
> **相关规则**：`rules/project.md` §11（反模式条目清单）。本文件是**审查清单和反模式代码示例的唯一来源**，其他文件的检查清单均指向此处。

---

## 1. 通用审查要点

所有代码改动都需要满足以下要求：

### 1.1 代码质量

- ✅ `pnpm lint` 无错误输出
- ✅ `pnpm typecheck` 前后端无类型错误
- ✅ `pnpm build` 前后端构建成功
- ✅ 无 `any` 类型使用（尤其在跨模块接口处），使用 `unknown` + 类型断言或定义具体类型
- ✅ 无未使用的 import 或变量
- ✅ 没有重复的逻辑（可以抽取为公共函数）
- ✅ 命名清晰有意义（`handleClick` → `handleDeleteDomain`）

### 1.2 安全

- ✅ 无硬编码的 JWT 密钥、AccessKey、Token、密码
- ✅ 敏感信息通过环境变量读取
- ✅ 所有数据库查询包含 `userId` 过滤（用户数据隔离）
- ✅ 密码使用 `bcryptjs` 哈希存储，不存储明文
- ✅ JWT token 有合理的过期时间
- ✅ 无 SQL 注入风险（使用 Prisma 而非原始 SQL）

### 1.3 日志

- ✅ 没有 `console.log` / `console.error` / `console.warn`
- ✅ 后端使用 `logger.info/warn/error` 记录关键操作
- ✅ 日志中不泄露敏感信息（如 password、secret 字段值）

### 1.4 格式与规范

- ✅ 导入按字母序排序（perfectionist/sort-imports）
- ✅ 后端 `import` 语句带 `.js` 扩展名
- ✅ 使用语义色（`bg-card` / `text-muted-foreground`）而非硬编码颜色
- ✅ 条件类名使用 `cn()` 工具函数

---

## 2. 前端审查要点

### 2.1 表单

- ✅ 所有表单使用 `react-hook-form`（`useForm` + `register` / `Controller`）
- ✅ 没有手写 `useState` 管理表单字段和验证
- ✅ shadcn/ui 的 `Select` / `Switch` / `Checkbox` 使用 `Controller` 包裹，**不使用 `register`**
- ✅ `Controller` 中绑定了 `rules` 对象以触发验证
- ✅ 必填字段的 `Label` 中有红色 `<span className="text-red-500 ml-1">*</span>`
- ✅ 字段下方有错误提示：`{errors.xxx && <p className="text-xs text-red-500">{errors.xxx.message}</p>}`
- ✅ 提交按钮在 `isSubmitting` 状态下设置 `disabled`
- ✅ 表单提交成功后调用 `reset()` 重置字段

### 2.2 用户反馈

- ✅ **没有使用 `alert()`** — 所有反馈走 `sonner` 的 `toast.success/error/info`
- ✅ 删除等危险操作使用 `useConfirm()` 对话框确认
- ✅ `toast.error` 使用 `error.message` 作为消息（Axios 拦截器已处理）

### 2.3 组件使用

- ✅ 没有手动修改 `components/ui/` 下的 shadcn/ui 生成文件
- ✅ 自定义组件放在 `components/` 根目录
- ✅ 业务页面放在 `pages/<route>/` 目录
- ✅ 图标统一使用 `lucide-react`，不使用 emoji 或内联 svg

### 2.4 Zustand Store

- ✅ 每个 Store 定义清晰的接口
- ✅ Store 的 action 使用 `set()` 更新状态
- ✅ HTTP 请求使用 `lib/api.ts` 的 Axios 实例
- ✅ 错误时 re-throw，让页面层可以 catch 并 toast
- ✅ 没有直接在组件中 `fetch()` 或 `axios()` 调用

### 2.5 路由

- ✅ 受保护路由用 `ProtectedRoute` 包裹
- ✅ 路由路径与目录命名有意义（`/providers` → `pages/providers/`）

---

## 3. 后端审查要点

### 3.1 分层架构

- ✅ `routes/`（控制器层）：只做参数校验、鉴权、调用 service、返回统一响应
- ✅ `routes/` 不直接调用 `prisma.*`
- ✅ `services/`（业务层）：业务逻辑、权限校验（userId）、多表协调、事务
- ✅ `services/` 不直接构造 HTTP 响应
- ✅ `providers/<name>/`：封装官方 SDK、解析响应、暴露领域方法
- ✅ `providers/` 不访问数据库、不写业务判断
- ✅ `models/`：纯 CRUD 封装
- ✅ 单向调用链：routes → services → models → prisma

### 3.2 参数校验

- ✅ 所有 POST / PUT / PATCH 请求使用 Zod schema 校验
- ✅ schema 定义在 route 层，使用 `z.safeParse()` 而非 `z.parse()`
- ✅ 校验失败时返回 `HTTP_STATUS.BAD_REQUEST` 和可读的错误信息
- ✅ URL 参数（如 `:id`）也使用 Zod 校验

### 3.3 统一响应

- ✅ 所有接口使用 `sendSuccess()` / `sendError()` 返回
- ✅ 正确使用 `HTTP_STATUS` 常量（200/201/204/400/401/403/404/500）
- ✅ 响应格式为 `{ code, message, data? }`
- ✅ code === 0 表示成功，其他表示失败

### 3.4 用户数据隔离

- ✅ 所有查询使用 `findFirst({ where: { id, userId } })` 而非 `findUnique({ where: { id } })`
- ✅ 所有更新使用 `updateMany({ where: { id, userId } })` 而非 `update()`
- ✅ 所有删除使用 `deleteMany({ where: { id, userId } })` 而非 `delete()`
- ✅ 列表查询包含 `where: { userId }` 过滤

### 3.5 Provider 能力检查

- ✅ 域名同步前检查 `features.domainSync`
- ✅ DNS 管理前检查 `features.dnsManagement`
- ✅ 自动续期前检查 `features.autoRenew`
- ✅ 能力检查在 service 层（而非 route 层）执行

### 3.6 Provider config 字段

- ✅ Provider 的 `config` 字段（JSON 字符串）在 service 层做 `JSON.parse()` 解析
- ✅ 解析后验证必要字段存在
- ✅ 错误时抛出有意义的错误消息（如 "缺少 accessKeyId"）

### 3.7 删除操作

- ✅ 删除 Provider 时手动级联删除关联域名（事务保证一致性）
- ✅ 删除 Domain 时由数据库层自动级联删除 DNS 记录 / Reminder / RenewalLog
- ✅ 删除操作有用户确认（在前端）和用户隔离（在后端）

### 3.8 日志

- ✅ 使用 `logger.info` 记录正常操作（如 "Domain created"）
- ✅ 使用 `logger.warn` 记录警告（如 "Provider credential validation failed"）
- ✅ 使用 `logger.error` 记录异常，附带 `error` 对象和上下文信息
- ✅ 日志中包含 `userId` 和操作 ID，便于追踪

### 3.9 数据库与迁移

- ✅ schema.prisma 变更后执行 `pnpm prisma migrate dev` 创建迁移
- ✅ 每次 schema 变更后执行 `pnpm prisma generate` 更新类型
- ✅ 可空字段正确声明为 `DateTime?` / `String?` 等
- ✅ 新字段设置合理的默认值（或保持可选）

### 3.10 同步审计日志（SyncLog）

- ✅ `providerService.syncProviderDomains` 在每次同步后写入 `SyncLog` 记录（含成功/失败/部分成功状态）
- ✅ `SyncLog` 写入包含 `domainsSynced` / `dnsInserted` / `dnsDeleted` 计数与 `details`（JSON 字符串）明细
- ✅ 同步失败时 `SyncLog.error` 字段记录错误信息
- ✅ `SyncLog` 查询包含 `userId` 过滤（与其他业务表一致的用户隔离）
- ✅ `/api/sync-logs` 接口走 `routes → services → models` 分层，不在 route 层直接操作 prisma

---

## 4. 常见反模式示例（代码示例唯一来源）

反模式条目清单见 `rules/project.md` §11。以下是代码示例：

### 4.1 ❌ 错误：前端手写表单验证

```tsx
// ❌ 不要这样做
const [name, setName] = useState('')
const [error, setError] = useState('')

const handleSubmit = () => {
  if (!name) {
    setError('名称必填')
    alert('名称必填')
    return
  }
  // ...
}
```

### 4.2 ✅ 正确：使用 react-hook-form

```tsx
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>()

const onSubmit = handleSubmit(async (data) => {
  try {
    await createDomain(data)
    toast.success('创建成功')
  } catch (error: any) {
    toast.error(error.message || '创建失败')
  }
})
```

### 4.3 ❌ 错误：后端 route 层直接操作 prisma

```typescript
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  // ❌ 不要在 route 层直接操作 prisma
  const domains = await prisma.domain.findMany({ where: { userId: req.user!.userId } })
  res.json(domains)
})
```

### 4.4 ✅ 正确：分层调用

```typescript
// route 层
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const domains = await domainService.listDomains(req.user!.userId)
    sendSuccess(res, domains)
  } catch (error: any) {
    sendError(res, error.message, 1, HTTP_STATUS.INTERNAL_SERVER_ERROR)
  }
})

// service 层
export async function listDomains(userId: number) {
  logger.info({ userId }, 'Listing domains')
  return listByUserId(userId)
}

// model 层
export async function listByUserId(userId: number) {
  return prisma.domain.findMany({
    where: { userId },
    include: { provider: true },
    orderBy: { createdAt: 'desc' as const },
  })
}
```

### 4.5 ❌ 错误：没有用户数据隔离

```typescript
// ❌ 危险！其他用户可以通过 ID 访问不属于自己的数据
const domain = await prisma.domain.findUnique({ where: { id } })
```

### 4.6 ✅ 正确：用户数据隔离

```typescript
const domain = await prisma.domain.findFirstOrThrow({
  where: { id, userId },
})
```

---

## 5. 目录与文件命名检查

- ✅ pages/ 下按路由分目录，入口为 `index.tsx`，页面专属子组件使用 PascalCase（如 `DomainFilter.tsx`、`DomainFormDialog.tsx`）
- ✅ components/ 下的自定义组件使用 PascalCase
- ✅ stores/ 下的文件使用 camelCase（如 `domains.ts`、`providers.ts`）
- ✅ routes/ 下的文件使用 camelCase（如 `domains.ts`、`providers.ts`）
- ✅ services/ 下的文件使用 camelCase（如 `domainService.ts`、`providerService.ts`）
- ✅ providers/<name>/ 下的文件使用 camelCase（如 `apiClient.ts`、`provider.ts`、`syncer.ts`）
- ✅ 目录使用 kebab-case（如 `notification-channels`）

---

## 6. 审查反馈格式

审查完成后，用以下格式向用户反馈：

```
## 代码审查结果（Y 项通过，N 项需要改进）

### ✅ 通过的项目
- [项目 1] 说明
- [项目 2] 说明

### ⚠️ 需要改进的项目
- [问题 1] [位置: 文件路径/行号] [建议: 具体建议]
- [问题 2] [位置: 文件路径/行号] [建议: 具体建议]

### 🔧 自动修复的建议
（如果 lint:fix 可以解决某些问题，在此列出）
```

---

## 7. 自我审查快速清单（唯一来源，提交前过一遍）

- ✅ 代码已格式化：`pnpm lint:fix`
- ✅ ESLint 无错误：`pnpm lint`
- ✅ TypeScript 类型检查通过：`pnpm typecheck`
- ✅ 生产构建通过：`pnpm build`
- ✅ 前端：所有表单使用 `react-hook-form` + `toast`
- ✅ 前端：没有 `alert()` / `console.log`
- ✅ 前端：没有手动修改 `components/ui/` 下的文件
- ✅ 后端：routes 层没有直接调用 prisma
- ✅ 后端：所有 import 带 `.js` 扩展名
- ✅ 后端：所有查询包含 userId 过滤
- ✅ 前后端：没有硬编码的敏感信息
- ✅ 前后端：使用统一的 API 响应格式
- ✅ Provider 操作前检查了 ProviderFeatures 能力
- ✅ 服务商域名同步操作写入了 `SyncLog` 审计记录
