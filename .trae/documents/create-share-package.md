# 创建 `share` workspace package 用于前后端共享类型

## Context（背景）

当前 monorepo 中 `packages/client` 和 `packages/server` 存在多处类型定义重复，最典型的是 `ApiResponse<T>` 在 [packages/server/src/utils/response.ts:3-7](file:///d:/code/nodejs/DMGR/packages/server/src/utils/response.ts#L3-L7) 和 [packages/client/src/lib/api.ts:3-7](file:///d:/code/nodejs/DMGR/packages/client/src/lib/api.ts#L3-L7) 中完全相同地定义了两份。同样地，`ProviderFeatures` / `ProviderField` 在后端 [packages/server/src/providers/base.ts:53-69](file:///d:/code/nodejs/DMGR/packages/server/src/providers/base.ts#L53-L69) 与前端 [packages/client/src/stores/providers.ts:4-17](file:///d:/code/nodejs/DMGR/packages/client/src/stores/providers.ts#L4-L17) 中重复。分页结构 `{ page, pageSize, total, totalPages }` 在后端多个 model 文件中以内联形式重复出现。

这些重复违反了 SSOT（单一数据源）原则，且随着 API 演进容易出现前后端定义不一致的 bug（如刚修复的 `providerId` 过滤问题就是前后端契约不一致的体现）。

本次创建 `share` workspace package 作为前后端共享类型的唯一来源，先迁入最明确重复的类型，建立可扩展的基础设施，后续可逐步迁入更多共享类型（实体类型、Zod schema 等）。

## 设计决策

**采用「源码直消费 + 仅类型导出」模式**，理由：

1. 用户需求是「API 接口类型等」——以类型为主，不需要运行时代码
2. 两个消费者（client 用 Vite、server 用 tsx/tsc）都能通过 `moduleResolution: bundler` 直接解析 `.ts` 源码
3. 使用 `import type` 导入，编译期被擦除，无需 build 步骤、无需 `.js` 扩展名（项目后端的 `.js` 扩展名规则只针对包内相对路径导入，不针对裸包导入如 `import { z } from 'zod'`）
4. 未来若需共享运行时代码（如 Zod schema），同一套 `exports` 配置即可支持，无需重构

**包名用 `share`**（与现有 `client`/`server` 命名风格一致，用户明确指定）。

## 初始迁移范围

| 类型 | 当前位置（后端） | 当前位置（前端） | 说明 |
|------|-----------------|-----------------|------|
| `ApiResponse<T>` | `server/src/utils/response.ts:3-7` | `client/src/lib/api.ts:3-7` | 统一 API 响应契约 |
| `Pagination` | 各 model 内联 `{ page, pageSize, total, totalPages }` | 各 store 内联 | 通用分页结构 |
| `PaginatedResponse<T>` | 各 model 的 `Paginated*` 接口 | 各 store 的 `*Response` 接口 | 通用分页响应 |
| `ProviderFeatures` | `server/src/providers/base.ts:65-69` | `client/src/stores/providers.ts:13-17` | 服务商能力声明 |
| `ProviderField` | `server/src/providers/base.ts:53-60` | `client/src/stores/providers.ts:4-11` | 服务商配置字段定义 |

**不在本次范围**（留作后续 PR）：
- 实体类型（Domain / Provider / DNSRecord / RenewalLog 等）——后端依赖 Prisma 生成类型，需仔细设计
- `*Filters` / `Create*Input` 接口——数量多，建议单独 PR
- `ProviderConfig` / `ProviderType`（前后端命名不一致）——需统一命名
- Zod schema 共享——运行时代码，需额外考虑

## 实施步骤

### 1. 创建 `packages/share/` 目录结构

```
packages/share/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # 统一导出
    ├── api.ts          # ApiResponse<T>
    ├── pagination.ts   # Pagination, PaginatedResponse<T>
    └── provider.ts     # ProviderFeatures, ProviderField
```

### 2. `packages/share/package.json`

```json
{
  "name": "share",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit --forceConsistentCasingInFileNames"
  },
  "devDependencies": {
    "typescript": "catalog:"
  }
}
```

关键点：
- `"exports": { ".": "./src/index.ts" }` 让消费者通过 `import { ApiResponse } from 'share'` 直接解析到源码
- 无 `dependencies`（纯类型包），仅 `typescript` 作为 devDependency
- 无 `build` 脚本（noEmit）

### 3. `packages/share/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

### 4. 类型源文件

**`src/api.ts`**：
```typescript
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data?: T
}
```

**`src/pagination.ts`**：
```typescript
export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}
```

**`src/provider.ts`**：
```typescript
export interface ProviderField {
  key: string
  label: string
  type: 'text' | 'password' | 'url'
  required: boolean
  placeholder?: string
  description?: string
}

export interface ProviderFeatures {
  domainSync: boolean
  dnsManagement: boolean
  autoRenew: boolean
}
```

**`src/index.ts`**：
```typescript
export * from './api'
export * from './pagination'
export * from './provider'
```

### 5. 注册 workspace 依赖

在 `packages/server/package.json` 和 `packages/client/package.json` 的 `dependencies` 中添加（按字母序插入）：
```json
"share": "workspace:*"
```

然后运行 `pnpm install --no-frozen-lockfile` 创建 workspace 符号链接。

### 6. 更新消费者代码

**后端 `packages/server/src/utils/response.ts`**：
- 删除本地 `ApiResponse` 接口定义（第 3-7 行）
- 顶部添加 `import type { ApiResponse } from 'share'`
- 保留运行时函数（`success` / `error` / `sendSuccess` / `sendError` / `HTTP_STATUS`）

**前端 `packages/client/src/lib/api.ts`**：
- 删除本地 `ApiResponse` 接口定义（第 3-7 行）
- 顶部添加 `import type { ApiResponse } from 'share'`

**后端 `packages/server/src/providers/base.ts`**：
- 删除本地 `ProviderFeatures`（第 65-69 行）和 `ProviderField`（第 53-60 行）接口定义
- 顶部添加 `import type { ProviderField, ProviderFeatures } from 'share'`
- 保留其他接口（`ProviderConfig` 仍引用 `ProviderFeatures` / `ProviderField`，现在从 share 导入）

**前端 `packages/client/src/stores/providers.ts`**：
- 删除本地 `ProviderField`（第 4-11 行）和 `ProviderFeatures`（第 13-17 行）接口定义
- 顶部添加 `import type { ProviderField, ProviderFeatures } from 'share'`
- 保留 `ProviderType` 接口（它引用 `ProviderField` / `ProviderFeatures`，现在从 share 导入）

### 7. 更新根 `package.json` 的 typecheck 脚本

将 [package.json:16](file:///d:/code/nodejs/DMGR/package.json#L16) 的：
```json
"typecheck": "pnpm --filter server typecheck && pnpm --filter client typecheck"
```
改为（share 先于其他包检查，因为它是依赖项）：
```json
"typecheck": "pnpm --filter share typecheck && pnpm --filter server typecheck && pnpm --filter client typecheck"
```

### 8. ESLint 配置

根 [eslint.config.js](file:///d:/code/nodejs/DMGR/eslint.config.js) 的 `eslint .` 命令会自动覆盖 `packages/share/`，无需额外配置。share 包是纯 TypeScript 类型文件，会被现有规则正确 lint。

## 关键文件清单

需要新建：
- `packages/share/package.json`
- `packages/share/tsconfig.json`
- `packages/share/src/index.ts`
- `packages/share/src/api.ts`
- `packages/share/src/pagination.ts`
- `packages/share/src/provider.ts`

需要修改：
- `packages/server/package.json`（添加 share 依赖）
- `packages/client/package.json`（添加 share 依赖）
- `packages/server/src/utils/response.ts`（改用 share 的 ApiResponse）
- `packages/client/src/lib/api.ts`（改用 share 的 ApiResponse）
- `packages/server/src/providers/base.ts`（改用 share 的 ProviderFeatures/ProviderField）
- `packages/client/src/stores/providers.ts`（改用 share 的 ProviderFeatures/ProviderField）
- `package.json`（根，更新 typecheck 脚本）

## 验证

1. **安装依赖**：`pnpm install --no-frozen-lockfile`
2. **类型检查**：`pnpm typecheck` —— 三个包（share / server / client）均需通过
3. **Lint**：`pnpm lint` —— 0 errors
4. **后端构建**：`pnpm build:server`（即 `pnpm --filter server build`）—— 确认 `import type` 被正确擦除，`dist/` 不包含对 share 的运行时引用
5. **前端构建**：`pnpm build:client`（即 `pnpm --filter client build`）—— 确认 Vite 能正确解析 share 包
6. **运行时验证**：启动 `pnpm dev`，确认前后端正常工作，API 响应格式不变
