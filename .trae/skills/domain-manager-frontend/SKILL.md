# Domain Manager 前端开发 Skill

> 面向 AI Agent 的前端开发速查指南。当你需要修改 `packages/client/` 下的代码时，先阅读本文件。

---

## 1. 快速开始：你的第一个前端改动

假设你需要添加一个新页面（如"域名到期提醒"），按以下步骤执行：

1. **创建页面组件** — 在 `pages/` 下创建新文件
2. **使用 Zustand store** — 在 `stores/` 中找到或新建对应领域的 store
3. **使用 react-hook-form 处理表单** — 所有用户输入走 `useForm`
4. **使用 sonner toast 反馈** — 操作结果走 `toast.success / toast.error`
5. **使用 useConfirm 处理危险操作** — 删除等危险操作走确认对话框
6. **在 App.tsx 注册路由** — 添加 `<Route path="/reminders" element={<Reminders />} />`
7. **质量保证** — `pnpm lint` → `pnpm typecheck` → `pnpm build:client`

---

## 2. 核心技术栈速查

| 技术 | 用途 | 关键文件 |
|------|------|---------|
| **React 19** | UI 框架 | `.tsx` 文件 |
| **react-router** | 路由 | `App.tsx` |
| **Zustand** | 状态管理 | `stores/*.ts` |
| **react-hook-form** | 表单验证 | 所有表单 |
| **Axios** | HTTP 请求 | `lib/api.ts` |
| **sonner** | 用户反馈 / Toast | `App.tsx` 中挂载，全局使用 |
| **shadcn/ui** | UI 组件库 | `components/ui/*.tsx` |
| **Tailwind CSS** | 样式 | 内联 `className` |
| **lucide-react** | 图标库 | `<Globe />`, `<Database />`, `<RefreshCw />` 等 |
| **date-fns** | 日期处理 | `format()`, `differenceInDays()` 等 |

---

## 3. 目录结构与职责

```
packages/client/src/
├── App.tsx                      # 路由配置 + 全局布局 + ThemeProvider + Toaster
├── main.tsx                     # 应用入口
├── components/                  # 自定义业务组件
│   ├── ui/                      # shadcn/ui 标准组件（CLI 生成，不要手动修改！）
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── textarea.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── popover.tsx
│   │   ├── calendar.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── Logo.tsx                 # 自定义品牌 Logo
│   ├── DatePicker.tsx           # 日期选择器
│   ├── Pagination.tsx           # 分页组件
│   └── DomainFilter.tsx         # 域名过滤组件
├── hooks/                       # 自定义 Hooks
│   └── useConfirm.tsx           # 确认对话框 Hook（删除等危险操作）
├── lib/                         # 工具库
│   ├── api.ts                   # Axios 实例配置（含 JWT token）
│   └── utils.ts                 # 通用工具函数（cn 等）
├── pages/                       # 页面组件（按路由命名）
│   ├── Login.tsx                # 登录 / 注册（未受保护）
│   ├── Domains.tsx              # 域名管理
│   ├── Providers.tsx            # 服务商管理
│   ├── NotificationChannels.tsx # 通知渠道管理
│   ├── RenewalLogs.tsx          # 续期日志
│   ├── Profile.tsx              # 个人资料
│   ├── AutoRenewConfig.tsx      # 自动续期配置
│   └── SyncLogs.tsx             # 同步记录（筛选 + 分页 + 详情对话框）
├── stores/                      # Zustand 状态管理（按领域拆分）
│   ├── auth.ts                  # 认证状态（token, user, login/logout）
│   ├── domains.ts               # 域名状态
│   ├── providers.ts             # 服务商状态
│   ├── dnsRecords.ts            # DNS 记录状态
│   ├── notificationChannels.ts  # 通知渠道状态
│   ├── renewalLogs.ts           # 续期日志状态
│   ├── syncLogs.ts              # 同步日志状态
│   └── theme.ts                 # 主题状态（light / dark / system）
└── index.css                    # 全局样式 + Tailwind CSS v4 指令
```

---

## 4. 表单验证（最重要规范）

所有用户输入表单**必须**使用 `react-hook-form`，**禁止**手写 `useState` 管理表单状态。

### 4.1 标准表单模板（带原生 Input）

```tsx
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CreateDomainForm {
  name: string
  notes?: string
}

const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateDomainForm>({
  defaultValues: { name: '', notes: '' },
})

const onSubmit = handleSubmit(async (data) => {
  try {
    await createDomain(data)
    toast.success('域名创建成功')
    reset()
  } catch (error: any) {
    toast.error(error.message || '创建失败')
  }
})

return (
  <Card>
    <CardHeader>
      <CardTitle>添加域名</CardTitle>
    </CardHeader>
    <CardContent>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* 必填字段：Label 中加红色 * */}
        <div className="space-y-2">
          <Label htmlFor="name">
            域名
            <span className="text-red-500 ml-1">*</span>
          </Label>
          <Input
            id="name"
            placeholder="example.com"
            {...register('name', {
              required: '域名必填',
              maxLength: { value: 255, message: '最多 255 个字符' },
            })}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* 可选字段 */}
        <div className="space-y-2">
          <Label htmlFor="notes">备注</Label>
          <Input
            id="notes"
            {...register('notes', {
              maxLength: { value: 1000, message: '最多 1000 个字符' },
            })}
          />
          {errors.notes && (
            <p className="text-xs text-red-500">{errors.notes.message}</p>
          )}
        </div>

        {/* 提交按钮：isSubmitting 状态下禁用 */}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '提交中...' : '创建'}
        </Button>
      </form>
    </CardContent>
  </Card>
)
```

### 4.2 shadcn/ui Select + Controller 模板

shadcn/ui 的 `Select` / `Switch` / `Checkbox` 等非原生组件**必须**使用 `Controller` 包装，不能用 `register`：

```tsx
import { useForm, Controller } from 'react-hook-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const { control, formState: { errors } } = useForm({
  defaultValues: { type: '' },
})

<Controller
  control={control}
  name="type"
  rules={{ required: '请选择服务商类型' }}
  render={({ field }) => (
    <Select value={field.value} onValueChange={field.onChange}>
      <SelectTrigger>
        <SelectValue placeholder="选择类型" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="aliyun">阿里云</SelectItem>
        <SelectItem value="tencent">腾讯云</SelectItem>
        <SelectItem value="cloudflare">Cloudflare</SelectItem>
        <SelectItem value="dnspod">DNSPod</SelectItem>
        <SelectItem value="namecheap">Namecheap</SelectItem>
        <SelectItem value="vps8">VPS8</SelectItem>
      </SelectContent>
    </Select>
  )}
/>
{errors.type && (
  <p className="text-xs text-red-500">{errors.type.message}</p>
)}
```

### 4.3 Switch + Controller 模板

```tsx
import { Controller } from 'react-hook-form'
import { Switch } from '@/components/ui/switch'

<Controller
  control={control}
  name="autoRenew"
  render={({ field }) => (
    <Switch
      checked={field.value}
      onCheckedChange={field.onChange}
    />
  )}
/>
```

### 4.4 动态字段（Provider config）

服务商的配置字段由后端 `providers/config.ts` 中的 `fields` 动态决定，前端根据 `provider.type` 渲染不同字段：

```tsx
import { useForm, Controller } from 'react-hook-form'
import { watch } from 'react-hook-form'
import { toast } from 'sonner'

// 假设 typeFields 由 providers store 获取
// 字段格式: { key: string, label: string, type: 'text' | 'password', required: boolean, placeholder?: string }

const { register, control, watch, formState: { errors } } = useForm({
  defaultValues: { name: '', type: '', config: {} },
})

const selectedType = watch('type')
const typeFields = BUILT_IN_PROVIDERS[selectedType]?.fields || []

{/* 动态渲染每个配置字段 */}
{typeFields.map((field) => (
  <div key={field.key} className="space-y-2">
    <Label htmlFor={field.key}>
      {field.label}
      {field.required && <span className="text-red-500 ml-1">*</span>}
    </Label>
    <Input
      id={field.key}
      type={field.type === 'password' ? 'password' : 'text'}
      placeholder={field.placeholder}
      {...register(`config.${field.key}` as const, field.required
        ? { required: `${field.label}必填` }
        : undefined)}
    />
    {(errors as any).config?.[field.key] && (
      <p className="text-xs text-red-500">
        {(errors as any).config?.[field.key]?.message}
      </p>
    )}
  </div>
))}
```

### 4.5 验证规则速查

| 场景 | react-hook-form |
|------|-----------------|
| 必填 | `required: 'xxx必填'` |
| 最大长度 | `maxLength: { value: 255, message: '最多 255 个字符' }` |
| 最小长度 | `minLength: { value: 6, message: '最少 6 位' }` |
| 邮箱格式 | `pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '邮箱格式不正确' }` |
| 正整数 | 前端可选配合 TypeScript 类型，后端用 Zod `z.coerce.number().int().positive()` |
| 条件必填 | `required: watch('mode') === 'auto' ? 'xxx必填' : false` |

---

## 5. 用户反馈（Toast + Confirm）

### 5.1 Toast（sonner）

**禁止使用 `alert()`**。所有操作成功/失败反馈走 `sonner` toast。

```typescript
import { toast } from 'sonner'

toast.success('操作成功')
toast.success(`同步成功！新增 ${newDomains} 个域名`)
toast.error(error.message || '操作失败')
toast.info('提示信息')
toast.warning('域名即将到期，请及时续期')
```

**Toast vs Dialog 选择**：

| 场景 | 使用 |
|------|------|
| 操作成功反馈 | `toast.success` |
| 操作错误 / API 失败 | `toast.error` |
| 一般提示 | `toast.info` |
| 需要用户确认的危险操作（删除） | `useConfirm` 对话框 |
| 字段输入错误 | 字段下方 `text-red-500` 提示文字 |

### 5.2 确认对话框（useConfirm）

```tsx
import { useConfirm } from '@/hooks/useConfirm'
import { toast } from 'sonner'

const { confirm } = useConfirm()

const handleDelete = async (provider: Provider) => {
  const confirmed = await confirm({
    title: `删除服务商「${provider.name}」`,
    description: `确定要删除此服务商吗？该服务商下的所有域名及其 DNS 记录也将被一并删除。此操作不可撤销。`,
    confirmText: '删除',
    destructive: true, // 红色按钮，表示破坏性操作
  })
  if (!confirmed) return

  try {
    await deleteProvider(provider.id)
    toast.success('服务商已删除')
  } catch (error: any) {
    toast.error(error.message || '删除失败')
  }
}
```

---

## 6. Zustand Store 标准模式

### 6.1 Store 模板

```typescript
import { create } from 'zustand'
import api from '@/lib/api'

interface Domain {
  id: number
  name: string
  providerId?: number
  expiryDate?: string
  status: string
  // ...
}

interface DomainState {
  domains: Domain[]
  loading: boolean
  error: string | null
  fetchDomains: () => Promise<void>
  createDomain: (data: Partial<Domain>) => Promise<Domain>
  updateDomain: (id: number, data: Partial<Domain>) => Promise<void>
  deleteDomain: (id: number) => Promise<void>
}

export const useDomainStore = create<DomainState>((set) => ({
  domains: [],
  loading: false,
  error: null,

  fetchDomains: async () => {
    set({ loading: true, error: null })
    try {
      const res = await api.get<Domain[]>('/domains')
      set({ domains: res.data, loading: false })
    } catch (error: any) {
      set({ error: error.message || '获取域名失败', loading: false })
      throw error  // 让页面层可以 catch 并 toast
    }
  },

  createDomain: async (data) => {
    const res = await api.post<Domain>('/domains', data)
    const newDomain = res.data
    set((state) => ({ domains: [...state.domains, newDomain] }))
    return newDomain
  },

  updateDomain: async (id, data) => {
    await api.put<Domain>(`/domains/${id}`, data)
    set((state) => ({
      domains: state.domains.map((d) =>
        d.id === id ? { ...d, ...data } : d
      ),
    }))
  },

  deleteDomain: async (id) => {
    await api.delete(`/domains/${id}`)
    set((state) => ({
      domains: state.domains.filter((d) => d.id !== id),
    }))
  },
}))
```

### 6.2 在页面中使用 Store

```tsx
import { useDomainStore } from '@/stores/domains'

const { domains, loading, fetchDomains, createDomain, deleteDomain } = useDomainStore()

// 页面加载时获取数据
useEffect(() => {
  fetchDomains().catch((err) => toast.error(err.message))
}, [])

// 或在表单提交后刷新
const handleCreate = async (data) => {
  try {
    await createDomain(data)
    toast.success('创建成功')
    // 不需要手动刷新，Store 已自动更新
  } catch (error: any) {
    toast.error(error.message)
  }
}
```

---

## 7. API 调用（Axios）

统一使用 `lib/api.ts` 的 Axios 实例，**禁止直接 `fetch()`**。

### 7.1 api.ts 已内置的约定

- 自动附带 `Authorization: Bearer <token>`（从 `auth` store 获取）
- 401 响应自动跳转 `/login` 并清除本地 token
- 成功响应自动提取 `res.data.data`（后端返回 `{code, message, data}`）
- 错误时 `error.message` 即为后端返回的可读消息

### 7.2 标准调用模式

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

## 8. shadcn/ui 使用规范

### 8.1 目录组织

- **`components/ui/`** — 仅存放 `shadcn/ui CLI` 生成的标准组件。**绝不手动修改此目录下的文件！**
- **`components/` 根目录** — 自定义业务组件（如 `Logo.tsx`、`DatePicker.tsx`、`Pagination.tsx`）
- **`pages/`** — 页面级组件

### 8.2 添加新的 shadcn/ui 组件

```bash
cd packages/client
pnpm dlx shadcn@latest add checkbox switch table
```

### 8.3 样式模式速查

| 场景 | 正确用法 |
|------|---------|
| 间距 | `space-y-4` / `gap-4` / `p-6` |
| 语义色 | `bg-card` / `text-muted-foreground` / `border-border` |
| 按钮 | `Button variant="default"`（主）/ `variant="outline"`（次）/ `variant="destructive"`（危险） |
| 截断文本 | `truncate` |
| Flex 居中 | `flex items-center justify-center` |
| 表格斑马纹 | `odd:bg-white even:bg-slate-50` |
| 加载态 | `disabled` + `Loading...` 文案 |
| 条件类名 | `cn('bg-primary', isActive && 'ring-2')` |
| 图标 | `lucide-react` 的 `<Globe />`, `<Database />` 等 |

### 8.4 Card 模板

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>副标题描述</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 内容 */}
  </CardContent>
</Card>
```

### 8.5 Table 模板

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>域名</TableHead>
      <TableHead>服务商</TableHead>
      <TableHead>到期日期</TableHead>
      <TableHead>状态</TableHead>
      <TableHead className="text-right">操作</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {domains.map((domain) => (
      <TableRow key={domain.id}>
        <TableCell className="font-medium">{domain.name}</TableCell>
        <TableCell>{domain.provider?.name || '-'}</TableCell>
        <TableCell>{format(domain.expiryDate, 'yyyy-MM-dd')}</TableCell>
        <TableCell>
          <Badge variant={domain.status === 'active' ? 'default' : 'secondary'}>
            {domain.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => handleEdit(domain)}>编辑</Button>
          <Button variant="destructive" size="sm" onClick={() => handleDelete(domain)}>删除</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 9. 主题与暗色模式

由 `stores/theme.ts` 管理，支持 `'light' | 'dark' | 'system'`。

```tsx
import { useThemeStore } from '@/stores/theme'

const { theme, setTheme } = useThemeStore()
```

**颜色使用原则**：**禁止硬编码颜色值**（如 `color: #000` / `bg-gray-100`），必须使用 Tailwind CSS v4 的语义色：

| 语义色 | 用途 |
|--------|------|
| `bg-background` | 页面背景 |
| `bg-card` | 卡片背景 |
| `bg-primary` | 主色调 |
| `bg-muted` | 次要背景（如 Badge） |
| `text-foreground` | 主文字色 |
| `text-muted-foreground` | 次要文字色 |
| `border-border` | 边框色 |
| `ring-ring` | 焦点环 |

---

## 10. 图标规范

**统一使用 `lucide-react`**，禁止使用 emoji 或内联 svg 作为业务图标（Logo 除外）。

```tsx
import { Globe, Database, RefreshCw, Trash2, Pencil, Shield, Bell, Settings } from 'lucide-react'

<Button size="sm">
  <Globe className="h-4 w-4 mr-2" />
  同步
</Button>
```

---

## 11. 路由与受保护路由

所有需要登录的路由在 `App.tsx` 中用 `ProtectedRoute` 包裹（基于 `react-router`）：

```tsx
<Route path="/login" element={<Login />} />
<Route path="/" element={
  <ProtectedRoute>
    <Domains />
  </ProtectedRoute>
} />
<Route path="/providers" element={
  <ProtectedRoute>
    <Providers />
  </ProtectedRoute>
} />
<Route path="/sync-logs" element={
  <ProtectedRoute>
    <SyncLogs />
  </ProtectedRoute>
} />
```

**顶部导航（dropdown）**：顶级菜单精简为 4 项 — 域名管理、服务商管理（dropdown：服务商列表 / 同步记录）、通知渠道、续期（dropdown：续期日志 / 续期配置）。`/sync-logs` 路由位于"服务商管理"下拉菜单中。

---

## 12. 快速检查清单（提交前）

- ✅ 所有表单使用 `useForm` + `register` / `Controller`，没有手写 `useState` 管理字段
- ✅ 必填字段的 `Label` 中有红色 `<span className="text-red-500 ml-1">*</span>`
- ✅ 字段错误时下方显示 `text-xs text-red-500` 错误消息
- ✅ `isSubmitting` 状态下提交按钮设置 `disabled`
- ✅ shadcn/ui 的 Select / Switch / Checkbox 用 `Controller` 包裹，不用 `register`
- ✅ 没有 `alert()`，用户提示走 `toast.*` 或 `useConfirm`
- ✅ 没有 `console.log` / `console.error` 遗留在生产代码中
- ✅ 使用语义色（`bg-card` / `text-muted-foreground`）而非原始色
- ✅ `components/ui/` 下没有手动添加/修改的文件
- ✅ 条件类名使用 `cn()` 工具函数
- ✅ 图标统一使用 `lucide-react`
- ✅ 日期处理使用 `date-fns`（`format()` 等）
- ✅ 所有受保护路由用 `ProtectedRoute` 包裹
- ✅ `pnpm lint` 无错误
- ✅ `pnpm typecheck` 通过
- ✅ `pnpm build:client` 生产构建通过
