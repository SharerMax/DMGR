---
name: "domain-manager-frontend"
description: "Frontend development for Domain Manager React app. Invoke when working on React components, pages, hooks, stores, or UI components in packages/client."
---

# Domain Manager Frontend

React 18 + TypeScript + Vite + shadcn/ui + Zustand + Tailwind CSS

## 目录结构

```
packages/client/src/
├── components/
│   ├── ui/              # shadcn/ui 组件（不要手动修改，用 CLI 添加）
│   └── DomainFilter.tsx # 域名过滤组件
├── hooks/
│   └── useConfirm.tsx   # 确认对话框 Hook
├── lib/
│   ├── api.ts           # Axios 实例（自动附带 JWT）
│   └── utils.ts         # cn()、日期格式化等工具
├── pages/               # 页面组件
├── stores/              # Zustand 状态管理
├── api/                 # API 函数
├── App.tsx              # 路由 + 布局 + 主题
└── main.tsx
```

## 核心模式

### Zustand Store

```typescript
import { useAuthStore } from '@/stores/auth'
const { user, login, logout } = useAuthStore()
```

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

### API 调用

`lib/api.ts` 的 Axios 实例自动附带 JWT token 和错误拦截，直接使用即可。

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
