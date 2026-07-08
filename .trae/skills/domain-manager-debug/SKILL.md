# Domain Manager 调试 Skill

> 面向 AI Agent 的问题排查与快速修复指南。遇到问题时按以下步骤排查。

---

## 1. 调试第一步：确认开发环境

```bash
# 确认 Node.js 版本 >= 22.21
node --version

# 确认 pnpm 版本
pnpm --version

# 确认依赖已安装
ls -la node_modules/ | head -5

# 确认数据库文件存在
ls -la packages/server/src/prisma/
```

---

## 2. 常见前端问题

### 2.1 前端页面白屏或控制台报错 401

**症状**：打开 http://localhost:3000 后页面空白，或控制台报 401 Unauthorized

**排查步骤**：
1. 检查 auth store 的 token 是否有效（localStorage）
2. 确认后端在 `http://localhost:3001` 正常运行
3. 检查 `JWT_SECRET` 是否在前后端一致

**快速修复**：
- 重新登录获取新 token
- 检查 `packages/client/src/lib/api.ts` 中的 baseURL 配置

### 2.2 表单提交无反应 / 验证不触发

**症状**：点击提交按钮后无任何反馈，必填字段无红色错误提示

**排查步骤**：
1. 检查是否使用了 `react-hook-form` 而非手写 `useState`
2. 确认 `handleSubmit` 正确绑定到 `<form onSubmit={...}>`
3. 确认 `register` 正确绑定到字段，或 `Controller` 正确包裹非原生组件
4. 检查 `errors` 是否在字段下方有条件渲染

**常见原因**：
- ❌ shadcn/ui 的 `Select` / `Switch` 使用了 `register` 而不是 `Controller`
- ❌ 提交按钮没有写 `type="submit"`（按钮默认是 submit，但要确认）
- ❌ `onSubmit` 中写了 `alert(error)` 而不是 `toast.error(error.message)`

### 2.3 API 请求返回 undefined

**症状**：`res.data` 是 undefined 或数据结构不符合预期

**排查**：
- 检查后端响应是否为 `{ code, message, data }` 格式
- 检查前端 Axios 拦截器是否正确提取了 `res.data.data`
- 在浏览器 Network 面板查看实际响应

---

## 3. 常见后端问题

### 3.1 "Prisma Client could not be found" 错误

**修复**：
```bash
cd packages/server
pnpm prisma generate
```

### 3.2 Null constraint violation on `expiryDate` / 其他可空字段

**原因**：Schema 中字段声明为 `DateTime?` 但数据库列仍为 NOT NULL，或迁移未执行

**修复**：
```bash
cd packages/server
pnpm prisma migrate dev
pnpm prisma generate
```

### 3.3 Provider 同步失败

**排查步骤**：
1. 检查 provider 的 `config` 字段（JSON 字符串）是否正确解析
2. 确认 AccessKey / Token 是否有效
3. 查看 Pino 日志：

```bash
cd packages/server
pnpm dev   # 观察控制台 Pino 日志输出
```

日志中应包含类似：
```
[2024-01-01T12:00:00.000Z] INFO: Syncing domains for provider aliyun
[2024-01-01T12:00:01.000Z] ERROR: Failed to sync domains - InvalidAccessKeyId
```

### 3.4 API 返回 401 Unauthorized

**排查**：
- 检查请求头是否包含 `Authorization: Bearer <token>`
- 检查 token 是否过期（JWT 默认有效期）
- 检查 `JWT_SECRET` 是否与签发 token 时一致
- 检查 `routes/` 是否正确应用了 `authMiddleware`

### 3.5 API 返回 400 Bad Request

**排查**：
- 检查 Zod schema 验证是否过于严格
- 检查前端发送的字段名是否与 schema 匹配
- 检查 `z.coerce.number()` 是否在处理字符串数字时报错

### 3.6 数据库中存在脏数据

**症状**：删除 provider 后某些域名仍存在，或孤立的 DNS 记录

**修复**：
```bash
cd packages/server
pnpm tsx src/prisma/cleanup.ts
```

### 3.7 TypeScript 编译报错

**症状**：`pnpm typecheck` 有错误输出

**常见原因**：
1. `import` 语句缺少 `.js` 扩展名 → 修复为 `import { xxx } from '@/path/file.js'`
2. `findUnique` 调用应改为 `findFirst({ where: { id, userId } })`（用户数据隔离）
3. Prisma 类型不匹配 → 执行 `pnpm prisma generate`
4. Zod schema 中使用了不存在的字段 → 对照数据库 schema 检查

---

## 4. 日志查看

### 4.1 后端 Pino 日志

```bash
cd packages/server
pnpm dev   # 直接查看控制台输出
```

或使用 pino-pretty 格式化：
```bash
pnpm dev | pnpm pino-pretty
```

### 4.2 前端浏览器控制台

- 打开浏览器 DevTools → Console 查看
- API 请求在 Network 面板查看
- React 组件状态在 Components 面板查看

---

## 5. 快速修复速查表

| 问题 | 修复命令 / 操作 |
|------|----------------|
| 依赖锁文件冲突 | `pnpm install --no-frozen-lockfile` |
| Prisma Client 类型不匹配 | `cd packages/server && pnpm prisma generate` |
| 数据库表结构不匹配 | `cd packages/server && pnpm prisma migrate dev` |
| 脏数据 | `cd packages/server && pnpm tsx src/prisma/cleanup.ts` |
| 前端热更新不工作 | 重启 `pnpm dev:client` |
| 端口占用 (3000/3001) | Windows: `netstat -ano \| findstr :3001` 然后 `taskkill /PID <id> /F` |
| Token 过期 | 重新登录，或延长 `middleware/auth.ts` 中的有效期 |
| 表单验证不触发 | 确认用 `useForm` + `register` / `Controller` |
| Toast 不显示 | 检查 `App.tsx` 中是否挂载了 `<Toaster />`，以及是否使用了 `sonner` 的 `toast` |

---

## 6. API 响应调试

### 6.1 检查统一响应格式

**正确格式**（前端 Axios 拦截器依赖）：
```typescript
{ code: 0, message: '操作成功', data: [... ] }  // 成功
{ code: 1, message: '参数错误', data: null }     // 失败
```

### 6.2 在 route 层添加临时调试日志

```typescript
// 临时调试：打印请求参数
logger.info({ params: req.params, body: req.body }, 'Debug: request')

// 然后检查终端输出
```

**注意**：调试完成后务必删除这些临时日志！

---

## 7. Provider 第三方集成调试

### 7.1 阿里云 DNS API 失败

1. 确认 `accessKeyId` 和 `accessKeySecret` 是否正确
2. 检查 RAM 用户是否有 DNS 相关权限
3. 查看 Pino 日志中的错误信息（包含阿里云 SDK 原始错误）

### 7.2 腾讯云 DNS API 失败

1. 确认 `SecretId` 和 `SecretKey` 是否正确
2. 检查 CAM 策略是否有 `dnspod:*` 权限
3. 可能需要在腾讯云控制台开启 API 访问

### 7.3 Cloudflare API 失败

1. 确认 API Token 是否有 `Zone.DNS` 权限
2. 在 Cloudflare Dashboard → My Profile → API Tokens 验证 Token

### 7.4 Namecheap / DNSPod / VPS8

- 检查各服务商文档，确认凭证格式与权限要求
- 查看 `providers/<name>/apiClient.ts` 中的请求封装是否正确

---

## 8. 表单验证调试

### 8.1 确认 react-hook-form 正确初始化

```tsx
// 打印 errors 观察验证状态
console.log('errors:', errors)  // 开发调试（提交前删除）
```

### 8.2 动态字段（Provider config）验证不生效

**原因**：嵌套字段 `config.xxx` 的 errors 路径较深，可能未正确访问

**检查**：
```tsx
// 确认 errors.config 存在
{(errors as any)?.config?.[field.key] && (
  <p className="text-xs text-red-500">
    {(errors as any).config[field.key].message}
  </p>
)}
```

### 8.3 Controller 包裹的组件状态不同步

**检查**：
```tsx
<Controller
  control={control}
  name="type"
  rules={{ required: '请选择服务商类型' }}  // ✅ rules 必须写在 Controller 里
  render={({ field }) => (
    <Select value={field.value} onValueChange={field.onChange}>
      {/* ... */}
    </Select>
  )}
/>
```

---

## 9. 生产构建错误排查

### 9.1 TypeScript 错误

```bash
# 定位具体是哪个文件有问题
pnpm typecheck  # 完整输出，搜索 error 所在行

# 常见问题：
# - .js 扩展名缺失
# - 类型不匹配（如 findUnique vs findFirst）
# - import 路径错误
```

### 9.2 ESLint 错误

```bash
# 自动修复可修复的问题
pnpm lint:fix

# 查看不可自动修复的问题
pnpm lint
```

---

## 10. 调试后清理清单

- ✅ 删除了所有临时的 `console.log` / `console.error`
- ✅ 删除了所有临时的调试日志
- ✅ 代码格式化：`pnpm lint:fix`
- ✅ 类型检查通过：`pnpm typecheck`
- ✅ 构建通过：`pnpm build`
- ✅ 未修改 `components/ui/` 目录下的文件
