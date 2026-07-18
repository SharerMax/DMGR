# AGENTS.md — Domain Manager 项目指南

> **Domain Manager** — 集中管理多服务商域名与 DNS 记录的单页应用（SPA）。
> 后端：Express.js 5.2 + TypeScript + Prisma + SQLite；前端：React 19 + Vite + shadcn/ui + Zustand + react-hook-form；共享类型：`packages/share`（前后端公用的 API 契约类型，仅类型导出）。Monorepo：`packages/client` + `packages/server` + `packages/share`。

---

## 快速决策路径（开始前必读）

根据你的任务类型，按以下路径找到对应的规范与技能文档：

```
你的任务是什么？
│
├─ 修改 前端 React 代码（页面/组件/表单/Store）
│   └─ 必读：.trae/rules/frontend.md + .trae/skills/domain-manager-frontend/SKILL.md
│
├─ 修改 后端 Express 代码（API/Service/Model/Provider）
│   └─ 必读：.trae/rules/backend.md + .trae/skills/domain-manager-backend/SKILL.md
│
├─ 修改 / 新增 前后端共享的 API 类型（实体、Input、Filter、Stats 等）
│   └─ 必读：.trae/skills/domain-manager-share/SKILL.md
│
├─ 配置 / 命令 / 依赖 / 迁移 / 开发流程问题
│   └─ 必读：.trae/rules/local.md + .trae/skills/domain-manager-dev/SKILL.md
│
├─ 遇到 Bug / 错误 / 问题排查
│   └─ 必读：.trae/skills/domain-manager-debug/SKILL.md
│
├─ 代码审查 / 质量检查 / 提交前自检
│   └─ 必读：.trae/skills/domain-manager-review/SKILL.md
│
└─ 通用规范（代码风格、Git、目录命名、安全、反模式等）
    └─ 必读：.trae/rules/project.md
```

> **原则**：`rules/` 是「必须遵守的声明式规范」（无代码模板），`skills/` 是「怎么做的操作指南」（含代码模板）。如果两者有冲突，以 `rules/` 为准。每条信息只在唯一来源文件中定义，其他文件通过链接引用。

---

## 顶层目录结构

```
DMGR/
├── .trae/
│   ├── rules/                 # 项目规则（声明式，必须遵守）
│   │   ├── project.md         # 通用：包管理、提交、分层原则、API 格式、日志、命名、安全、反模式
│   │   ├── frontend.md        # 前端：表单、shadcn/ui、状态管理、路由
│   │   ├── backend.md         # 后端：分层架构、ESM、Zod、JWT、userId 隔离、Provider 能力
│   │   └── local.md           # 本地环境：Windows、版本、命令、测试账号
│   └── skills/                # 项目技能（操作指南，含代码模板）
│       ├── domain-manager-backend/SKILL.md   # 后端开发指南（CRUD 模板、Zod、Prisma、加新 Provider）
│       ├── domain-manager-frontend/SKILL.md  # 前端开发指南（表单模板、Controller、Zustand、shadcn）
│       ├── domain-manager-share/SKILL.md     # 共享类型指南（share 包使用与扩展模式）
│       ├── domain-manager-dev/SKILL.md       # 开发工作流（依赖、DB 操作、环境变量、构建）
│       ├── domain-manager-debug/SKILL.md     # 问题排查（问题→修复映射、Provider 集成调试）
│       ├── domain-manager-review/SKILL.md    # 代码审查（审查清单、反模式代码示例、自检清单）
│       └── optimize-docs-structure/SKILL.md  # 文档结构优化（三层分层 + SSOT 方法论）
├── packages/
│   ├── client/               # 前端 (React 19 + Vite + shadcn/ui + Zustand + react-hook-form)
│   ├── server/               # 后端 (Express 5 + Prisma + SQLite + Zod + Pino)
│   └── share/                # 前后端共享类型（仅类型导出，源码直消费，无 build 步骤）
├── pnpm-workspace.yaml       # catalog 依赖版本声明
└── package.json              # 根 workspace：pnpm typecheck / lint 等聚合脚本
```

---

## 文件速查表

| 文件 | 职责 | 内容类型 |
|------|------|---------|
| `rules/project.md` | 项目级通用规则（包管理、提交、API 格式、日志、安全、反模式条目） | 声明式规则 |
| `rules/frontend.md` | 前端规则（表单、shadcn/ui、Zustand、API、主题、路由） | 声明式规则 |
| `rules/backend.md` | 后端规则（分层架构表、ESM、Zod、JWT、userId 隔离、ProviderFeatures 矩阵） | 声明式规则 |
| `rules/local.md` | 本地环境（OS、版本、命令速查、测试账号、Windows 问题） | 环境配置 |
| `skills/domain-manager-backend` | 后端开发指南（CRUD 模板、Zod 模式、Prisma 模式、DB 模型速查、加新 Provider） | 代码模板 |
| `skills/domain-manager-frontend` | 前端开发指南（表单模板、Controller、Zustand、shadcn 模板、语义色） | 代码模板 |
| `skills/domain-manager-share` | 共享类型指南（share 包设计、源码直消费模式、前后端扩展约定、陷阱） | 操作指南 |
| `skills/domain-manager-dev` | 开发工作流（变更流程、依赖管理、DB 操作、环境变量） | 操作指南 |
| `skills/domain-manager-debug` | 调试指南（前后端问题排查、Provider 集成调试、快速修复表） | 操作指南 |
| `skills/domain-manager-review` | 代码审查（审查清单、反模式代码示例、自检清单） | 审查清单 |
| `skills/optimize-docs-structure` | 文档结构优化（三层分层 + SSOT 方法论） | 操作指南 |
