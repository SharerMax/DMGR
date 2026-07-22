# 前端开发规范

> 适用于 `packages/client/` 下的所有代码。核心技术栈：React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS v4 + Zustand + react-hook-form + Axios + sonner。
> 本文件为**声明式规则**（「必须 / 禁止」），不含代码模板。模板见 `skills/domain-manager-frontend`。

---

## 1. 核心技术栈速查

| 类别 | 库 | 说明 |
|------|-----|------|
| 框架 | React 19 | 函数组件 + Hooks |
| 构建 | Vite | HMR 开发服务器 |
| UI | shadcn/ui + Tailwind CSS v4 | Vega 风格主题 |
| 状态 | Zustand | 按领域拆分 store |
| HTTP | Axios | 统一实例（`lib/api.ts`） |
| 表单 | react-hook-form | **所有表单必须使用** |
| 通知 | sonner | `toast.success/error/info` |
| 图标 | lucide-react | 统一图标库 |
| 日期 | date-fns + react-day-picker | 日期处理与选择器 |
| 路由 | React Router 8.x | API 从 `react-router` 导入（禁用 `react-router-dom`） |

---

## 2. 表单验证规则

- **所有表单必须使用 `react-hook-form`**（`useForm` + `register` / `Controller`）
- **绝对禁止**手写 `useState` 管理表单字段和验证
- shadcn/ui 的 `Select` / `Switch` / `Checkbox` 等非原生组件**必须**使用 `Controller` 包裹，**不使用 `register`**
- `Controller` 必须绑定 `rules` 对象以触发验证
- 必填字段的 `Label` 中必须添加红色 `*`：`<span className="text-red-500 ml-1">*</span>`
- 字段下方用 `text-xs text-red-500` 显示 `errors.xxx.message`
- 提交按钮在 `isSubmitting` 状态下必须 `disabled`，防止重复提交
- 表单提交成功后必须调用 `reset()` 重置字段
- **禁止使用 `alert()`** — 所有用户提示走 `toast.*` 或 `useConfirm`
- 表单模板见 `skills/domain-manager-frontend` §4

### 验证规则速查

| 场景 | 规则 |
|------|------|
| 必填 | `required: 'xxx必填'` |
| 邮箱 | `pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确' }` |
| 最大长度 | `maxLength: { value: 50, message: '最多 50 个字符' }` |
| 最小长度 | `minLength: { value: 6, message: '最少 6 位' }` |
| 数字 | `valueAsNumber: true` + `min: { value: 1, message: '必须大于 0' }` |
| 条件验证 | `required: watch('mode') === 'auto' ? 'xxx必填' : false` |

### 错误消息处理

- 前端验证失败：使用 `react-hook-form` 的 `errors.xxx.message`（用户即时可见）
- 后端返回的错误：使用 `toast.error(error.message)` 弹出通知
- 错误消息使用 `error.message`（Axios 拦截器已处理），**不用** `error.response?.data?.error`

---

## 3. shadcn/ui 组件规范

### 3.1 目录组织

- `components/ui/` — **仅存放 CLI 添加的标准组件**。**绝不手动修改此目录下的文件**（修改会被后续 `pnpm dlx shadcn@latest add` 覆盖）
- `components/` 根目录 — 自定义业务组件（如 `DatePicker.tsx`、`DataTablePagination.tsx`、`DomainFilter.tsx`、`Logo.tsx`）
- `pages/<route>/` — 页面级组件，**按路由路径分目录**（kebab-case），每个目录导出 `index.tsx`（编排根）+ 页面专属子组件（`PascalCase.tsx`，如 `DomainFilter.tsx`、`DomainTable.tsx`、`DomainFormDialog.tsx`）。单文件页面（如 login/profile）仅含 `index.tsx`

### 3.2 Primitive 库（Base UI）

- shadcn/ui 的底层 primitive 库为 **`@base-ui/react`**（`components.json` 的 `style` 为 `base-vega`），不再使用 `radix-ui`
- 业务代码**禁止直接** `import` `@base-ui/react/*`，所有 primitive 通过 `@/components/ui/*` 间接消费（保持替换成本可控）
- **渲染组合模式**：Base UI 使用显式 `render` prop 而非 Radix 的 `asChild`
  - 正确：`<DialogTrigger render={<Button />}>{children}</DialogTrigger>`
  - 错误：`<DialogTrigger asChild><Button>{children}</Button></DialogTrigger>`
- **Select API 变更**：`onValueChange` 回调的 `value` 类型为 `string | null`（无选中项时返回 `null`，不是 `undefined`）。业务代码需用 `value ?? undefined` 或 `value ?? 'all'` 转换
- **AlertDialog API 变更**：Base UI 没有独立的 `Action` primitive，shadcn 模板把 `AlertDialogAction`/`AlertDialogCancel` 实现为 Button 包装；不要在它们内部再嵌套 `<Button>`，直接传 `variant`/`size`/`onClick` 等 props
- 通过 `pnpm dlx shadcn@latest add <component> --overwrite --yes` 重新拉取模板以切换 primitive 或同步模板更新
- **Base UI 文档参考**：`https://base-ui.com/llms.txt`（LLM 友好的文档索引，包含所有组件的 API 与用法链接）

### 3.3 组件使用模式

| 组件 | 正确用法 | 避免 |
|------|---------|------|
| **间距** | `gap-2` / `gap-4` / `space-y-4` | `margin-top/bottom` 分散管理 |
| **颜色** | 语义色 `bg-primary` / `text-muted-foreground` | 原始色 `bg-blue-500` |
| **尺寸** | 统一 `size-*` | 分离的 `w-* h-*` |
| **条件类名** | `cn('a', condition && 'b')` | 字符串拼接 `` `a ${cond ? 'b' : ''}` `` |
| **截断文本** | `truncate` | `overflow-hidden text-ellipsis whitespace-nowrap` |
| **Card** | `CardHeader > CardTitle + CardDescription` + `CardContent` | 零散 div 手写卡片 |
| **z-index** | Dialog/Popover/Sheet 等覆盖组件自带 z-index | 手动设 `z-*` |
| **状态色** | `text-status-success/warning/error/info/disabled/danger` 语义类 + `Badge variant="..."` | 硬编码 `text-red-500` / `bg-green-100` |
| **加载态** | `Skeleton` 组件 | 自定义 `animate-pulse div` |
| **按钮图标** | 使用 `lucide-react` 图标 | 不规范的 emoji / svg |

### 3.4 确认对话框

危险操作（删除服务商、删除域名、退出登录等）**必须**使用 `useConfirm` 对话框二次确认（模板见 `skills/domain-manager-frontend` §5）

---

## 4. Zustand 状态管理

- 每个领域一个 store 文件，存放在 `stores/`

| Store | 文件 | 管理内容 |
|-------|------|---------|
| 认证 | `auth.ts` | 用户信息、token、登录/注销 |
| 概览 | `dashboard.ts` | 首页概览数据（统计、最近通知、续期记录） |
| 域名 | `domains.ts` | 域名列表、CRUD |
| 服务商 | `providers.ts` | 服务商列表、CRUD、同步操作 |
| DNS 记录 | `dnsRecords.ts` | DNS 记录管理 |
| 通知渠道 | `notificationChannels.ts` | 渠道配置与 CRUD |
| 通知配置 | `notificationConfigs.ts` | 各通知类型开关与过期提醒天数阈值 |
| 通知记录 | `notificationLogs.ts` | 通知发送记录查询 |
| 续期日志 | `renewalLogs.ts` | 续期记录与统计 |
| 同步日志 | `syncLogs.ts` | 服务商域名同步记录与详情 |
| 主题 | `theme.ts` | `light` / `dark` / `system` |

- Store 的 action 使用 `set()` 更新状态
- HTTP 请求**必须**使用 `lib/api.ts` 的 Axios 实例，**禁止**在组件中直接 `fetch()` 或 `axios()`
- 错误时必须 re-throw，让页面层可以 catch 并 toast
- **共享类型**：store 中使用的实体类型（`Domain` / `Provider` / `DNSRecord` 等）、Input 类型、Stats 类型**必须**从 `share` 包 `import type` 消费，禁止在 `stores/` 中重复定义同名类型
  - 正确：`import type { Domain, CreateDomainInput } from 'share'`
  - **本地扩展例外**：当 share 类型不满足前端特定需求时（如 UI Select 的 `'all'` 哨兵值、分页参数 `page`/`pageSize`），可在 store 中定义本地扩展接口继承 share 类型：`interface DomainFilters extends SharedDomainFilters { page?: number; pageSize?: number }`
- Store 模板见 `skills/domain-manager-frontend` §6、`skills/domain-manager-share` §4

---

## 5. API 调用（Axios）

- 统一使用 `lib/api.ts` 的 Axios 实例，**禁止直接 `fetch()`**
- Axios 拦截器自动处理：附带 JWT token、401 自动跳转 `/login`、成功响应自动提取 `res.data.data`、错误时 `error.message` 即为后端可读消息
- **响应类型**：所有 API 调用的响应类型必须从 `share` 包 `import type` 消费（`Domain` / `Provider` / `PaginatedResponse<T>` / `ApiResponse<T>` 等），与后端 API 契约保持一致
- 调用模板见 `skills/domain-manager-frontend` §7、`skills/domain-manager-share` §4

---

## 6. 主题与暗色模式

- 由 `stores/theme.ts` 管理偏好（`'light' | 'dark' | 'system'`），通过在 `<html>` 切换 `.dark` class 生效
- 使用 Tailwind CSS v4 的 CSS 变量（Vega 主题）
- **禁止硬编码颜色值**（如 `color: #000` / `bg-gray-100`），必须使用语义色 `text-foreground` / `bg-background` / `border-border`
- **状态色必须使用 CSS 变量语义类**：`text-status-success` / `text-status-warning` / `text-status-error` / `text-status-info` / `text-status-disabled` / `text-status-danger`（对应背景色 `bg-status-*-bg` / `bg-status-*-bg-light`），变量定义在 `index.css` 的 `:root` 和 `.dark` 中，`error` 和 `danger` 引用 `var(--destructive)`
- Toaster 配置：`position="top-right"`、`richColors`、`closeButton`

---

## 7. 通知系统（sonner）

- **禁止使用 `alert()`** — 所有用户提示走 `toast.*` 或 `useConfirm`
- Toaster 在 `App.tsx` 中挂载：`<Toaster position="top-right" richColors closeButton />`

**Toast vs Dialog 选择**：

| 场景 | 使用 |
|------|------|
| 操作成功反馈 | `toast.success` |
| 错误信息 | `toast.error` |
| 需要用户确认的危险操作 | `useConfirm()` 对话框 |
| 表单输入错误 | 字段下方 `text-red-500` 错误提示 |

---

## 8. 路由与页面组织

前端路由定义在 `App.tsx`（基于 `react-router`，**禁用 `react-router-dom`**）。页面组件按路由路径存放在 `pages/<route>/` 目录下（各导出 `index.tsx`）：

| 路由 | 页面目录 | 说明 |
|------|---------|------|
| `/login` | `pages/login/` | 登录 / 注册（未受保护） |
| `/` | `pages/dashboard/` | 概览首页（受保护） |
| `/domains` | `pages/domains/` | 域名管理（受保护） |
| `/providers` | `pages/providers/` | 服务商管理（受保护） |
| `/sync-logs` | `pages/sync-logs/` | 同步记录（受保护） |
| `/notification-configs` | `pages/notification-configs/` | 通知类型开关与过期提醒阈值（受保护） |
| `/notification-channels` | `pages/notification-channels/` | 通知渠道（受保护） |
| `/notification-logs` | `pages/notification-logs/` | 通知记录（受保护） |
| `/renewal-logs` | `pages/renewal-logs/` | 续期日志（受保护） |
| `/profile` | `pages/profile/` | 个人资料与密码修改（受保护） |
| `/auto-renew-config` | `pages/auto-renew-config/` | 自动续期配置（受保护） |

- 所有受保护路由使用 `ProtectedRoute` 组件包裹，未登录自动重定向到 `/login`

**顶部导航结构（dropdown）**：导航栏顶级菜单精简为 4 项（点击 Logo 返回概览首页）：

| 顶级菜单 | 子项 |
|---------|------|
| 域名（dropdown） | 域名列表 (`/domains`) |
| 服务商（dropdown） | 服务商列表 (`/providers`)、同步记录 (`/sync-logs`) |
| 通知（dropdown） | 通知配置 (`/notification-configs`)、渠道配置 (`/notification-channels`)、通知记录 (`/notification-logs`) |
| 续期（dropdown） | 续期日志 (`/renewal-logs`)、续期配置 (`/auto-renew-config`) |

---

## 9. 图标

- 统一使用 `lucide-react`，**禁止使用 emoji 或内联 svg**作为业务图标（Logo 除外）
