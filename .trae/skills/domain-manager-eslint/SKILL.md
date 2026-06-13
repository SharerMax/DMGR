---
name: "domain-manager-eslint"
description: "ESLint code standards and linting rules for Domain Manager. Invoke when checking code quality, fixing lint errors, or enforcing coding conventions."
---

# Domain Manager ESLint 规范

本项目使用 **@antfu/eslint-config** 作为 ESLint 配置基础，结合项目特定规则。

## 配置文件

- **主配置**: `eslint.config.js` (根目录)
- **ESLint 版本**: v10.4.1 (flat config)
- **基础配置**: @antfu/eslint-config v9.0.0

## 运行命令

```bash
# 检查代码规范
pnpm lint

# 自动修复
pnpm lint:fix
```

## 项目规则配置

```javascript
// eslint.config.js
import antfu from '@antfu/eslint-config'

export default antfu({
  vue: false,
  react: true,
  typescript: true,
  ignores: [
    'node_modules',
    'dist',
    '*.local',
    '*.db',
    'PROJECT_CONTEXT.md',
    '**/prisma/generated/**',
  ],
  rules: {
    'no-alert': 'off',           // 允许使用 alert
    'no-console': 'warn',        // console 语句警告
    'react-refresh/only-export-components': 'warn',
    'node/prefer-global/process': 'off',
    'unicorn/prefer-node-protocol': 'off',
    'antfu/top-level-function': 'off',
  },
})
```

## 核心规范要点

### TypeScript

- 严格类型检查，避免使用 `any`
- 导入使用 ESM 格式 (`.js` 扩展名在导入路径中)
- 类型定义优先使用 `interface`，复杂类型使用 `type`

### React

- 函数组件使用箭头函数或普通函数
- Hooks 必须在组件顶层调用
- 组件导出使用 `export default`
- Props 类型必须显式定义

```typescript
// 推荐
interface ButtonProps {
  variant?: 'default' | 'destructive'
  onClick?: () => void
}

const Button = ({ variant = 'default', onClick }: ButtonProps) => {
  return <button onClick={onClick}>{variant}</button>
}

export default Button
```

### 导入顺序

@antfu/eslint-config 自动排序导入：

1. Node.js 内置模块
2. 外部依赖
3. 内部模块 (`@/` 别名)
4. 相对导入
5. 类型导入 (`import type`)

```typescript
// 正确顺序示例
import type { Domain } from '@/stores/domains'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useDomainStore } from '@/stores/domains'
import { formatDate } from './utils'
```

### 代码风格

- **缩进**: 2 空格
- **引号**: 单引号 (single quotes)
- **分号**: 不使用分号 (no semicolons)
- **尾随逗号**: 多行时使用 (trailing commas)

```typescript
// 推荐
const config = {
  name: 'domain',
  version: '1.0.0',
  features: ['sync', 'dns'],
}

// 不推荐
const config = {
  name: "domain",
  version: "1.0.0",
  features: ["sync", "dns"]
};
```

### 文件命名

- **组件**: PascalCase (如 `Button.tsx`, `DomainList.tsx`)
- **工具函数**: camelCase (如 `formatDate.ts`, `apiClient.ts`)
- **页面**: PascalCase (如 `Domains.tsx`, `Providers.tsx`)
- **Store**: camelCase (如 `domains.ts`, `providers.ts`)

### 忽略目录

以下目录不进行 lint 检查：

- `node_modules/`
- `dist/`
- `*.local`
- `*.db`
- `PROJECT_CONTEXT.md`
- `**/prisma/generated/**` (Prisma 生成的代码)

## 常见问题修复

### 1. 导入顺序错误

```bash
pnpm lint:fix
```

自动修复导入顺序。

### 2. 未使用的变量

删除未使用的导入或变量，或使用 `_` 前缀标记有意忽略：

```typescript
// 忽略未使用参数
const handleClick = (_event: React.MouseEvent) => {
  // 不使用 event
}
```

### 3. 类型错误

确保所有变量和函数参数都有明确的类型定义：

```typescript
// 不推荐
function process(data) {
  return data.map(item => item.name)
}

// 推荐
interface Item {
  name: string
}

function process(data: Item[]): string[] {
  return data.map(item => item.name)
}
```

### 4. React Hooks 规则

- 不要在循环、条件或嵌套函数中调用 Hooks
- Hooks 名称必须以 `use` 开头

### 5. console 语句

生产代码应避免使用 `console.log`，调试完成后删除：

```typescript
// 调试时
console.log('Debug info:', data)

// 提交前删除或改为条件输出
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data)
}
```

## 最佳实践

### 前端 (packages/client)

1. 组件拆分：大型组件拆分为更小的子组件
2. Props 解构：使用解构获取 props
3. 状态管理：使用 Zustand store，避免 prop drilling
4. 样式：使用 Tailwind CSS，避免内联样式

### 后端 (packages/server)

1. 路由拆分：按功能模块拆分路由文件
2. 错误处理：统一错误响应格式
3. 类型安全：使用 Zod 验证输入
4. 数据库：使用 Prisma ORM，类型安全查询

## 检查清单

提交代码前检查：

1. `pnpm lint` 无错误
2. `pnpm build` 构建成功
3. 无 `console.log` 残留 (除非有条件判断)
4. 类型定义完整
5. 导入顺序正确