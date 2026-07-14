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
- `components/` 根目录 — 自定义业务组件（如 `DatePicker.tsx`、`Pagination.tsx`、`DomainFilter.tsx`、`Logo.tsx`）
- `pages/` — 页面级组件（按路由命名，如 `Domains.tsx`、`Providers.tsx`）

### 3.2 组件使用模式

| 组件 | 正确用法 | 避免 |
|------|---------|------|
| **间距** | `gap-2` / `gap-4` / `space-y-4` | `margin-top/bottom` 分散管理 |
| **颜色** | 语义色 `bg-primary` / `text-muted-foreground` | 原始色 `bg-blue-500` |
| **尺寸** | 统一 `size-*` | 分离的 `w-* h-*` |
| **条件类名** | `cn('a', condition && 'b')` | 字符串拼接 `` `a ${cond ? 'b' : ''}` `` |
| **截断文本** | `truncate` | `overflow-hidden text-ellipsis whitespace-nowrap` |
| **Card** | `CardHeader > CardTitle + CardDescription` + `CardContent` | 零散 div 手写卡片 |
| **z-index** | Dialog/Popover/Sheet 等覆盖组件自带 z-index | 手动设 `z-*` |
| **状态色** | `Badge variant="..."` 或 Button variant | 自定义 `text-red-500 bg-red-100` |
| **加载态** | `Skeleton` 组件 | 自定义 `animate-pulse div` |
| **按钮图标** | 使用 `lucide-react` 图标 | 不规范的 emoji / svg |

### 3.3 确认对话框

危险操作（删除服务商、删除域名、退出登录等）**必须**使用 `useConfirm` 对话框二次确认（模板见 `skills/domain-manager-frontend` §5）

---

## 4. Zustand 状态管理

- 每个领域一个 store 文件，存放在 `stores/`

| Store | 文件 | 管理内容 |
|-------|------|---------|
| 认证 | `auth.ts` | 用户信息、token、登录/注销 |
| 域名 | `domains.ts` | 域名列表、CRUD |
| 服务商 | `providers.ts` | 服务商列表、CRUD、同步操作 |
| DNS 记录 | `dnsRecords.ts` | DNS 记录管理 |
| 通知渠道 | `notificationChannels.ts` | 渠道配置与 CRUD |
| 续期日志 | `renewalLogs.ts` | 续期记录与统计 |
| 同步日志 | `syncLogs.ts` | 服务商域名同步记录与详情 |
| 主题 | `theme.ts` | `light` / `dark` / `system` |

- Store 的 action 使用 `set()` 更新状态
- HTTP 请求**必须**使用 `lib/api.ts` 的 Axios 实例，**禁止**在组件中直接 `fetch()` 或 `axios()`
- 错误时必须 re-throw，让页面层可以 catch 并 toast
- Store 模板见 `skills/domain-manager-frontend` §6

---

## 5. API 调用（Axios）

- 统一使用 `lib/api.ts` 的 Axios 实例，**禁止直接 `fetch()`**
- Axios 拦截器自动处理：附带 JWT token、401 自动跳转 `/login`、成功响应自动提取 `res.data.data`、错误时 `error.message` 即为后端可读消息
- 调用模板见 `skills/domain-manager-frontend` §7

---

## 6. 主题与暗色模式

- 由 `stores/theme.ts` 管理偏好（`'light' | 'dark' | 'system'`），通过在 `<html>` 切换 `.dark` class 生效
- 使用 Tailwind CSS v4 的 CSS 变量（Vega 主题）
- **禁止硬编码颜色值**（如 `color: #000` / `bg-gray-100`），必须使用语义色 `text-foreground` / `bg-background` / `border-border`
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

前端路由定义在 `App.tsx`（基于 `react-router`，**禁用 `react-router-dom`**）。页面组件存放在 `pages/`：

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | `Login.tsx` | 登录 / 注册（未受保护） |
| `/` | `Domains.tsx` | 域名管理首页（受保护） |
| `/providers` | `Providers.tsx` | 服务商管理（受保护） |
| `/sync-logs` | `SyncLogs.tsx` | 同步记录（受保护） |
| `/notification-channels` | `NotificationChannels.tsx` | 通知渠道（受保护） |
| `/renewal-logs` | `RenewalLogs.tsx` | 续期日志（受保护） |
| `/profile` | `Profile.tsx` | 个人资料与密码修改（受保护） |
| `/auto-renew-config` | `AutoRenewConfig.tsx` | 自动续期配置（受保护） |

- 所有受保护路由使用 `ProtectedRoute` 组件包裹，未登录自动重定向到 `/login`

**顶部导航结构（dropdown）**：导航栏顶级菜单精简为 4 项，子项放入下拉菜单：

| 顶级菜单 | 子项 |
|---------|------|
| 域名管理 | — |
| 服务商管理（dropdown） | 服务商列表 (`/providers`)、同步记录 (`/sync-logs`) |
| 通知渠道 | — |
| 续期（dropdown） | 续期日志 (`/renewal-logs`)、续期配置 (`/auto-renew-config`) |

---

## 9. 图标

- 统一使用 `lucide-react`，**禁止使用 emoji 或内联 svg**作为业务图标（Logo 除外）
