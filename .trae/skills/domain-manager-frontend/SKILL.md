---
name: "domain-manager-frontend"
description: "Frontend development for Domain Manager React app. Invoke when working on React components, pages, hooks, stores, or UI components in packages/client."
---

# Domain Manager Frontend

React 18 + TypeScript + Vite + shadcn/ui + Zustand + Tailwind CSS + Axios

## 目录结构

```
packages/client/src/
├── components/
│   ├── ui/              # shadcn/ui 组件（不要手动修改，用 CLI 添加）
│   ├── DatePicker.tsx   # 日期选择器（基于 shadcn/ui 封装）
│   ├── Pagination.tsx   # 分页组件
│   └── DomainFilter.tsx # 域名过滤组件
├── hooks/
│   └── useConfirm.tsx   # 确认对话框 Hook
├── lib/
│   ├── api.ts           # Axios 实例（统一响应处理 + JWT）
│   └── utils.ts         # cn()、日期格式化等工具
├── pages/               # 页面组件
│   ├── Login.tsx
│   ├── Domains.tsx
│   ├── Providers.tsx
│   ├── RenewalLogs.tsx
│   ├── NotificationChannels.tsx
│   ├── AutoRenewConfig.tsx
│   └── Profile.tsx
├── stores/              # Zustand 状态管理
│   ├── auth.ts          # 认证状态
│   ├── domains.ts       # 域名状态
│   ├── providers.ts     # 服务商状态
│   ├── renewalLogs.ts   # 续期日志状态
│   ├── notificationChannels.ts
│   ├── dnsRecords.ts
│   └── theme.ts
├── App.tsx              # 路由 + 布局 + 主题
└── main.tsx
```

## API 调用

`lib/api.ts` 的 Axios 实例：
- 自动附带 JWT token（从 localStorage 读取）
- 响应拦截器统一处理：成功时自动提取 `data` 字段（后端返回 `{ code, message, data }`）
- 401 时自动清除 token 并跳转登录页
- 错误时 `error.message` 即为后端返回的错误消息

```typescript
import api from '@/lib/api'

// GET - response.data 就是实际数据（已提取）
const res = await api.get<User>('/auth/me')
const user = res.data

// POST
const res = await api.post('/domains', data)
const newDomain = res.data

// 错误处理
try {
  await api.post('/domains', data)
} catch (error: any) {
  alert(error.message || '操作失败')
}
```

## 核心模式

### 自定义组件

**重要**: `components/ui/` 目录只允许 shadcn/ui CLI 添加的标准组件。自定义组件放在 `components/` 根目录：

- `DatePicker.tsx` - 日期/日期范围选择器（导出 `DatePicker`, `DateRangePicker`）
- `Pagination.tsx` - 分页组件（导出 `Pagination`）
- `DomainFilter.tsx` - 域名过滤组件

### Zustand Store

```typescript
import { useAuthStore } from '@/stores/auth'
const { user, login, logout } = useAuthStore()
```

现有 stores:
- `auth` - 用户认证
- `domains` - 域名管理
- `providers` - 服务商管理
- `renewalLogs` - 续期日志（含筛选、分页、统计）
- `notificationChannels` - 通知渠道
- `dnsRecords` - DNS 记录
- `theme` - 主题切换

### 确认对话框（替代 window.confirm）

```typescript
const { confirm, ConfirmDialog } = useConfirm()
const ok = await confirm({ title: '确认删除？', destructive: true })
// 在 JSX 中渲染 <ConfirmDialog />
```

### 主题切换

`stores/theme.ts` 管理 system/light/dark，通过 `<html>` 的 `.dark` class 切换，持久化到 localStorage。

### 添加新页面

1. 在 `src/pages/` 创建组件
2. 在 `App.tsx` 添加路由，用 `<ProtectedRoute>` 包裹

### 添加新 Store

1. 在 `src/stores/` 创建文件
2. 使用 Zustand `create` 定义 state + actions
3. 用 `api` 实例进行后端调用
4. 错误消息使用 `error.message`

## shadcn/ui 关键规则

- 用 `gap-*` 不用 `space-y-*`/`space-x-*`
- 用语义色 `bg-primary`/`text-muted-foreground`，不用原始色 `bg-blue-500`
- 用 `size-*` 替代 `w-* h-*`（等尺寸时）
- 用 `cn()` 合并条件类名
- 用 `truncate` 替代 `overflow-hidden text-ellipsis whitespace-nowrap`
- Dialog/Sheet 等覆盖组件不需要手动设 z-index
- Card 使用完整组合: CardHeader/CardTitle/CardDescription/CardContent/CardFooter
- 状态色用 Badge variant，不用原始色 span
- 加载态用 Skeleton，不用自定义 `animate-pulse` div
- Button 内图标用 `data-icon="inline-start"` 属性

## 添加 shadcn/ui 组件

```bash
cd packages/client && npx shadcn@latest add <component>
```

已添加的 shadcn/ui 组件：
- alert-dialog, badge, button, calendar, card, dialog, dropdown-menu, input, label, popover, select, switch, table, textarea
