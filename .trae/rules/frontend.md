# 前端开发规范

> 适用于 `packages/client/` 下的所有代码。核心技术栈：React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS v4 + Zustand + react-hook-form + Axios + sonner。

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

---

## 2. 表单验证（最重要规范）

### 2.1 所有表单必须使用 react-hook-form

**绝对禁止**手写 `useState` 管理表单字段和验证。

### 2.2 标准表单模板

```tsx
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FormData {
  name: string
  type: string
  accessKeyId: string
  accessKeySecret: string
}

const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
  defaultValues: { name: '', type: '', accessKeyId: '', accessKeySecret: '' },
})

const onSubmit = handleSubmit(async (data) => {
  try {
    await createProvider(data)
    toast.success('服务商创建成功')
    reset()
  } catch (error: any) {
    toast.error(error.message || '创建失败')
  }
})

<form onSubmit={onSubmit} className="space-y-4">
  {/* 原生 Input + register */}
  <div className="space-y-2">
    <Label htmlFor="name">
      名称
      <span className="text-red-500 ml-1">*</span>
    </Label>
    <Input
      id="name"
      {...register('name', {
        required: '名称必填',
        maxLength: { value: 50, message: '最多 50 个字符' },
      })}
    />
    {errors.name && (
      <p className="text-xs text-red-500">{errors.name.message}</p>
    )}
  </div>

  {/* shadcn/ui Select + Controller */}
  <div className="space-y-2">
    <Label>
      服务商类型
      <span className="text-red-500 ml-1">*</span>
    </Label>
    <Controller
      control={control}
      name="type"
      rules={{ required: '请选择服务商类型' }}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger>
            <SelectValue placeholder="请选择" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aliyun">阿里云</SelectItem>
            <SelectItem value="tencent">腾讯云</SelectItem>
            <SelectItem value="cloudflare">Cloudflare</SelectItem>
          </SelectContent>
        </Select>
      )}
    />
    {errors.type && (
      <p className="text-xs text-red-500">{errors.type.message}</p>
    )}
  </div>

  {/* 动态字段 - 配置字段 */}
  {typeFields.map(field => (
    <div key={field.key} className="space-y-2">
      <Label htmlFor={field.key}>
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={field.key}
        type={field.type === 'password' ? 'password' : 'text'}
        {...register(`config.${field.key}` as const, field.required
          ? { required: `${field.label}必填` }
          : undefined)}
        placeholder={field.placeholder}
      />
      {/* 错误消息 */}
      {(errors as any).config?.[field.key] && (
        <p className="text-xs text-red-500">{(errors as any).config?.[field.key]?.message}</p>
      )}
    </div>
  ))}

  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? '提交中...' : '创建'}
  </Button>
</form>
```

### 2.3 必填字段标识规则

- 在 `Label` 中添加红色 `*`：`<span className="text-red-500 ml-1">*</span>`
- 字段下方用 `text-xs text-red-500` 显示 `errors.xxx.message`
- 提交按钮在 `isSubmitting` 状态下需禁用，防止重复提交

### 2.4 验证规则速查

| 场景 | 规则 |
|------|------|
| 必填 | `required: 'xxx必填'` |
| 邮箱 | `pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确' }` |
| 最大长度 | `maxLength: { value: 50, message: '最多 50 个字符' }` |
| 最小长度 | `minLength: { value: 6, message: '最少 6 位' }` |
| 数字 | `valueAsNumber: true` + `min: { value: 1, message: '必须大于 0' }` |
| 条件验证 | `required: watch('mode') === 'auto' ? 'xxx必填' : false` |

### 2.5 错误消息处理

- 前端验证失败：使用 `react-hook-form` 的 `errors.xxx.message`（用户即时可见）
- 后端返回的错误：使用 `toast.error(error.message)` 弹出通知
- **禁止使用 `alert()`** — 所有用户提示走 toast 或对话框

---

## 3. shadcn/ui 组件规范

### 3.1 目录组织

- `components/ui/` — **仅存放 CLI 添加的标准组件**。**绝不手动修改此目录下的文件**。修改会被后续 `pnpm dlx shadcn@latest add` 覆盖
- `components/` 根目录 — 自定义业务组件（如 `DatePicker.tsx`、`Pagination.tsx`、`DomainFilter.tsx`、`Logo.tsx`）
- `pages/` — 页面级组件（按路由命名，如 `Domains.tsx`、`Providers.tsx`）

### 3.2 添加 shadcn/ui 组件

```bash
cd packages/client
pnpm dlx shadcn@latest add button dialog input label select
```

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
| **状态色** | `Badge variant="..."` 或 Button variant | 自定义 `text-red-500 bg-red-100` |
| **加载态** | `Skeleton` 组件 | 自定义 `animate-pulse div` |
| **按钮图标** | 使用 `lucide-react` 图标 | 不规范的 emoji / svg |

### 3.4 确认对话框（useConfirm）

危险操作（删除服务商、删除域名、退出登录等）**必须**使用 `useConfirm`：

```tsx
import { useConfirm } from '@/hooks/useConfirm'

const { confirm } = useConfirm()

const handleDelete = async (item: Item) => {
  const confirmed = await confirm({
    title: `删除${item.name}`,
    description: '确定要删除此项目吗？关联数据也将被删除，此操作不可撤销。',
    confirmText: '删除',
    destructive: true, // 红色按钮
  })
  if (!confirmed) return
  try {
    await deleteItem(item.id)
    toast.success('删除成功')
  } catch (error: any) {
    toast.error(error.message || '删除失败')
  }
}
```

---

## 4. Zustand 状态管理

### 4.1 按领域拆分 store

每个领域一个 store 文件，存放在 `stores/`：

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

### 4.2 Store 标准模式

```typescript
import { create } from 'zustand'
import api from '@/lib/api'

interface ItemState {
  items: Item[]
  loading: boolean
  error: string | null
  fetchItems: () => Promise<void>
  createItem: (data: CreateInput) => Promise<Item>
  updateItem: (id: number, data: Partial<CreateInput>) => Promise<Item>
  deleteItem: (id: number) => Promise<void>
}

export const useItemStore = create<ItemState>((set) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null })
    try {
      const res = await api.get<Item[]>('/items')
      set({ items: res.data, loading: false })
    } catch (error: any) {
      set({ error: error.message || '获取失败', loading: false })
      throw error // 让页面层可以继续 catch 并 toast
    }
  },

  createItem: async (data) => {
    const res = await api.post<Item>('/items', data)
    const newItem = res.data
    set((state) => ({ items: [...state.items, newItem] }))
    return newItem
  },
}))
```

---

## 5. API 调用（Axios）

统一使用 `lib/api.ts` 的 Axios 实例，**禁止直接 `fetch()`**。

```typescript
import api from '@/lib/api'

// GET
const res = await api.get<Domain[]>('/domains')
const domains = res.data // 拦截器已自动提取后端返回的 data 字段

// POST
const res = await api.post<Domain>('/domains', payload)

// PUT / DELETE
await api.put<Domain>(`/domains/${id}`, payload)
await api.delete(`/domains/${id}`)
```

**约定**：
- 前端 Axios 拦截器自动附带 JWT token
- 401 响应自动跳转 `/login` 并清除本地 token
- 成功响应自动提取 `res.data.data`（后端格式 `{code,message,data}`）
- 错误时 `error.message` 即为后端返回的可读消息

---

## 6. 主题与暗色模式

由 `stores/theme.ts` 管理偏好（`'light' | 'dark' | 'system'`），通过在 `<html>` 切换 `.dark` class 生效。

- 使用 Tailwind CSS v4 的 CSS 变量（Vega 主题）
- 禁止硬编码颜色值（如 `color: #000`），必须使用语义色 `text-foreground` / `bg-background` / `border-border`
- 测试暗色模式：切换主题后检查页面在两种模式下的对比度与可读性

---

## 7. 通知系统（sonner）

在 `App.tsx` 中挂载：

```tsx
import { Toaster } from 'sonner'
<Toaster position="top-right" richColors closeButton />
```

使用方式：

```typescript
toast.success('操作成功')
toast.error(error.message || '操作失败')
toast.info('提示信息')
toast.success(`同步成功！新增 ${count} 个域名`)
```

**Toast vs Dialog 选择**：

| 场景 | 使用 |
|------|------|
| 操作成功反馈 | `toast.success` |
| 错误信息 | `toast.error` |
| 需要用户确认的危险操作 | `useConfirm()` 对话框 |
| 表单输入错误 | 字段下方 `text-red-500` 错误提示 |

---

## 8. 路由与页面组织

前端路由定义在 `App.tsx`（基于 `react-router`）。页面组件存放在 `pages/`：

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

所有受保护路由使用 `ProtectedRoute` 组件包裹，未登录自动重定向到 `/login`。

**顶部导航结构（dropdown）**：导航栏顶级菜单精简为 4 项，子项放入下拉菜单：

| 顶级菜单 | 子项 |
|---------|------|
| 域名管理 | — |
| 服务商管理（dropdown） | 服务商列表 (`/providers`)、同步记录 (`/sync-logs`) |
| 通知渠道 | — |
| 续期（dropdown） | 续期日志 (`/renewal-logs`)、续期配置 (`/auto-renew-config`) |

---

## 9. 图标

统一使用 `lucide-react`，**禁止使用 emoji 或内联 svg**作为业务图标（Logo 除外）。

```tsx
import { Globe, Database, RefreshCw, Trash2, Pencil, Shield } from 'lucide-react'

<Button><Globe className="h-4 w-4 mr-2" />同步域名</Button>
```

---

## 10. 快速反模式检查清单

提交前对照检查：

- ✅ 所有表单使用 `useForm`，没有手写 `useState` 管理字段
- ✅ 必填字段有红色 `*` 标识，错误信息显示在字段下方
- ✅ 没有 `alert()`，用户提示走 `toast.*` 或 `useConfirm`
- ✅ 没有 `console.log` / `console.error` 遗留在生产代码中
- ✅ `components/ui/` 下没有手动添加/修改的文件
- ✅ 使用语义色（`bg-primary` / `text-muted-foreground`）而非原始色
- ✅ 错误消息使用 `error.message`（Axios 拦截器已处理），不用 `error.response?.data?.error`
- ✅ 条件类名使用 `cn()` 工具函数
- ✅ shadcn/ui Select/Switch/Checkbox 等非原生组件用 `Controller` 包裹，不要用 `register`
- ✅ `Controller` 正确绑定了 `rules` 对象以触发验证
