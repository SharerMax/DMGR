# 优化 rules / skills / AGENTS.md 按职责重组计划

> 目标：高效、准确、简单。核心原则 — **单一事实来源（SSOT）**：每条信息只在一个文件中定义，其他文件通过引用链接。

---

## 一、当前问题诊断

### 1.1 大量内容重复（同一信息出现在 3-7 个文件）

| 信息 | 出现位置 | 应保留的唯一来源 |
|------|---------|----------------|
| 分层架构规则 | AGENTS.md §3 + project.md §3 + backend.md §2.2 + backend skill §3 + review skill §3.1 | `rules/backend.md` |
| 分层架构代码模板 | backend skill §3.2 | `skills/domain-manager-backend` |
| ProviderFeatures 矩阵 | AGENTS.md §5 + backend.md §8 + backend skill §4 + dev skill §8 | `rules/backend.md` |
| API 响应格式 | AGENTS.md §9 + project.md §4 + backend.md §9 + backend skill §6 + dev skill §6.1 | `rules/project.md` |
| react-hook-form 规范 | AGENTS.md §4 + frontend.md §2 + frontend skill §4 | `rules/frontend.md` |
| 表单代码模板 | frontend.md §2.2 + frontend skill §4 | `skills/domain-manager-frontend` |
| userId 数据隔离 | AGENTS.md §6 + backend.md §6 + backend skill §8 + review skill §3.4 | `rules/backend.md` |
| 反模式清单 | AGENTS.md §12 + project.md §9 + backend.md §12 + frontend.md §10 + 3 个 skill | `rules/project.md`（条目）+ `skills/domain-manager-review`（代码示例）|
| 目录结构 | AGENTS.md §2 + backend.md §2.1 + 2 个 skill | `AGENTS.md`（顶层）+ 各 skill（分领域细节）|
| 命令速查 | AGENTS.md §1.2 + local.md §3 + dev skill §1/3/5 | `rules/local.md` |
| 环境变量 | AGENTS.md §10 + backend.md §11 + dev skill §9 | `skills/domain-manager-dev` |
| 测试账号 | AGENTS.md §1.3 + local.md §4 + dev skill §2 | `rules/local.md` |

### 1.2 rules/ 与 skills/ 边界模糊

- `rules/backend.md` §4.1、`rules/frontend.md` §2.2 包含完整代码模板 → 应属 skills
- skills 中重复 rules 的检查清单条目 → 应链接引用
- `skills/domain-manager-review` 整体是 rules 中反模式清单的重复

### 1.3 AGENTS.md 过载

501 行，覆盖了概览+目录+架构+表单+Provider+数据库+删除+API+环境+工作流+反模式+文件速查，与 rules/skills 大量重叠。

---

## 二、目标职责划分

```
AGENTS.md          → 纯导航枢纽（项目概览 2-3 句 + 决策树 + 顶层目录 + 文件速查表）
rules/             → 声明式规则（「必须遵守什么」，无代码模板）
  ├─ project.md    → 项目级通用规则（包管理、提交、命名、TS、安全、日志、反模式条目）
  ├─ frontend.md   → 前端规则（表单、shadcn/ui、toast、路由、状态、API 调用）
  ├─ backend.md    → 后端规则（分层、ESM、Zod、JWT、userId 隔离、Provider 能力、响应格式）
  └─ local.md      → 本地环境（OS、版本、命令、测试账号、Windows 问题）
skills/            → 操作指南（「怎么做」，含代码模板，不重复 rules）
  ├─ domain-manager-backend   → 后端开发指南（CRUD 模板、Zod 模式、Prisma 模式、加新 Provider）
  ├─ domain-manager-frontend  → 前端开发指南（表单模板、Controller、Zustand、shadcn 模板）
  ├─ domain-manager-dev       → 开发工作流（启停、依赖、DB 操作、环境变量、构建）
  ├─ domain-manager-debug     → 调试指南（问题→修复映射、Provider 集成调试）
  └─ domain-manager-review    → 审查清单（单一来源的反模式代码示例 + 自检清单）
```

**职责边界规则**：
- `rules/` 只写「必须 / 禁止」的声明式条目，**零代码块**（允许 1 行内联示例）
- `skills/` 开头写「相关规则见 `rules/xxx.md`」，**不重复规则条目**，只写操作步骤 + 代码模板
- `AGENTS.md` **不写任何规范内容**，只做导航

---

## 三、具体变更方案

### 3.1 AGENTS.md — 瘦身为纯导航枢纽（501 行 → ~80 行）

**保留**：
- 标题 + 1 段项目简介（2-3 句：是什么、技术栈一句话）
- §0 快速决策路径（任务类型 → 读哪个文件，保留并精简）
- 顶层目录结构（只保留 `.trae/`、`packages/`、配置文件，删除每个子文件的注释）
- 文件速查表（rules 4 个 + skills 5 个，一行描述每个文件的职责）
- 原则说明（rules=规范，skills=实操，冲突以 rules 为准）

**删除**（这些内容已在 rules/skills 中有唯一来源）：
- §1.1 核心能力表 → 移入 `rules/project.md`
- §1.2 启动命令 → 已在 `rules/local.md`
- §1.3 测试账号 → 已在 `rules/local.md`
- §2 详细目录结构 → 各 skill 保留分领域细节
- §3 分层架构 → 已在 `rules/backend.md`
- §4 表单验证规范 → 已在 `rules/frontend.md`（规则）+ `skills/domain-manager-frontend`（模板）
- §5 ProviderFeatures → 已在 `rules/backend.md`
- §6 数据隔离 → 已在 `rules/backend.md`
- §7 数据库模型速查 → 移入 `skills/domain-manager-backend`
- §8 删除操作规范 → 已在 `rules/backend.md`（规则）+ `skills/domain-manager-backend`（模板）
- §9 API 响应格式 → 已在 `rules/project.md`
- §10 环境变量 → 移入 `skills/domain-manager-dev`
- §11 工作流 → 移入 `skills/domain-manager-dev`
- §12 反模式清单 → 已在 `rules/project.md`
- §13 相关文件速查 → 精简后保留为导航表

### 3.2 rules/project.md — 项目级规则（去重，~160 → ~90 行）

**保留并整合**：
- §1 包管理与依赖（pnpm only、catalog、minimumReleaseAge）
- §2 提交规范（Conventional Commits type/scope 清单）
- §3 分层架构原则（**仅高层原则表**，不重复 backend.md 的细节，改为「详见 `rules/backend.md`」）
- §4 统一 API 响应格式（**唯一来源**，规则声明 + 1 行格式示例）
- §5 日志规范（Pino、禁 console）
- §6 命名规范表
- §7 TypeScript 规范
- §8 代码风格（ESLint）
- §9 安全与凭证

**新增**：
- 核心能力表（从 AGENTS.md §1.1 移入）
- 反模式条目清单（**唯一来源**，纯条目列表，无代码示例。代码示例在 `skills/domain-manager-review`）

**删除**：
- 与 backend.md/frontend.md 重复的分层架构细节表

### 3.3 rules/frontend.md — 前端规则（去代码模板，~265 → ~90 行）

**保留为声明式规则**（移除所有代码块）：
- §1 技术栈速查表（保留，是速查信息）
- §2 表单验证 → 改为规则条目：「所有表单必须用 react-hook-form」「禁止 useState 管理表单」「shadcn/ui Select/Switch 必须用 Controller」「必填字段 Label 加红色 *」「错误信息显示在字段下方」「提交按钮 isSubmitting 时 disabled」。**删除 §2.2 标准表单模板**（移至 frontend skill）
- §3 shadcn/ui 规范 → 保留规则条目 + 速查表，删除代码示例
- §4 Zustand → 保留规则条目（按领域拆分、用 lib/api.ts、错误 re-throw），删除 store 模板代码
- §5 API 调用 → 保留规则条目（用 Axios 实例、禁 fetch、错误用 error.message），删除代码
- §6 主题 → 保留规则条目（禁硬编码颜色、用语义色）
- §7 通知 → 保留规则条目（禁 alert、用 sonner、危险操作用 useConfirm）+ Toast vs Dialog 选择表
- §8 路由 → 保留规则条目 + 路由表 + 导航结构表
- §9 图标 → 保留规则条目
- §10 反模式检查清单 → **删除**，改为「见 `rules/project.md` 反模式清单」

### 3.4 rules/backend.md — 后端规则（去代码模板，~260 → ~110 行）

**保留为声明式规则**（移除所有代码块）：
- §1 技术栈速查表
- §2 分层架构 → 保留 §2.2 职责表（**唯一来源**），删除 §2.1 目录结构（已在 AGENTS.md 顶层 + backend skill 细节）
- §3 ESM 导入规范 → 保留规则条目，删除代码示例
- §4 Zod 参数校验 → 保留规则条目（所有 POST/PUT/PATCH 必须用 Zod、用 safeParse），删除 §4.1 模板和 §4.2 速查表代码
- §5 JWT 鉴权 → 保留规则条目，删除代码示例
- §6 数据层规范 → 保留规则条目（必须 userId 过滤、用 findFirst/updateMany/deleteMany），删除 model 模板代码
- §7 数据库操作 → 保留流程规则（migrate dev → generate），删除命令（命令在 local.md）
- §8 ProviderFeatures → 保留能力声明规则 + **能力矩阵表（唯一来源）** + 能力校验规则条目，删除代码示例
- §9 统一响应格式 → 改为「见 `rules/project.md` §4」，删除重复
- §10 日志规范 → 改为「见 `rules/project.md` §5」，保留 SyncLog 审计规则条目
- §11 环境变量 → **删除**，移至 `skills/domain-manager-dev`
- §12 反模式检查清单 → **删除**，改为「见 `rules/project.md` 反模式清单」

### 3.5 rules/local.md — 本地环境（轻度清理，~130 → ~110 行）

**保留**（已是命令/账号的唯一来源）：
- §1 OS 与 Shell
- §2 运行时与版本
- §3 项目命令速查（**唯一来源**）
- §4 测试账号（**唯一来源**）
- §5 Windows 常见问题
- §6 IDE 配置

**清理**：
- 确保命令与 `skills/domain-manager-dev` 不重复（dev skill 链接到本文件）

### 3.6 skills/domain-manager-backend/SKILL.md — 后端开发指南（去规则重复，553 → ~280 行）

**保留**（独有实操内容）：
- §1 快速开始（添加端点步骤）
- §2 目录结构（后端细节，**唯一来源**）
- §3 分层调用模式 + CRUD 端点模板（model→service→route 完整代码）
- §4 ProviderFeatures 工厂创建模板 + 能力校验模板（规则在 backend.md，这里只有代码）
- §5 导入规范 → **精简**，改为「规则见 `rules/backend.md` §3」，保留 1 个正确/错误对比示例
- §6 统一响应格式 → **精简**，改为「规则见 `rules/project.md` §4」，保留 sendSuccess/sendError 用法代码
- §7 Zod 参数校验模式 → 保留代码模板（POST body、动态 config）
- §8 userId 数据隔离 → **精简**，改为「规则见 `rules/backend.md` §6」，保留 1 个 model 模板示例
- §9 删除操作与级联 → 保留事务模板代码
- §10 数据库操作模板 → 保留（迁移流程、查询模式速查）
- §11 日志规范 → **删除**，改为「规则见 `rules/project.md` §5」，保留 SyncLog 说明
- §12 添加新服务商步骤 → 保留
- §13 快速检查清单 → **删除**，改为「见 `skills/domain-manager-review`」

**新增**：
- 数据库模型速查表（从 AGENTS.md §7 移入）
- 文件顶部加「相关规则：`rules/backend.md`」

### 3.7 skills/domain-manager-frontend/SKILL.md — 前端开发指南（去规则重复，654 → ~300 行）

**保留**（独有实操内容）：
- §1 快速开始（添加新页面步骤）
- §2 核心技术栈速查表
- §3 目录结构（前端细节，**唯一来源**）
- §4 表单验证模板 → 保留所有代码模板（标准表单、Select+Controller、Switch+Controller、动态字段），删除 §4.5 验证规则速查表（规则在 frontend.md）
- §5 Toast + useConfirm 模板 → 保留代码，删除 Toast vs Dialog 表（在 frontend.md）
- §6 Zustand Store 模板 → 保留完整代码
- §7 API 调用模式 → 保留代码示例，规则条目改为「见 `rules/frontend.md`」
- §8 shadcn/ui 使用 → 保留 Card/Table 模板代码，规则条目改为「见 `rules/frontend.md`」
- §9 主题 → **精简**，规则改为「见 `rules/frontend.md`」，保留语义色速查表
- §10 图标 → **删除**，改为「见 `rules/frontend.md`」
- §11 路由 → **精简**，规则改为「见 `rules/frontend.md`」，保留 ProtectedRoute 用法代码
- §12 快速检查清单 → **删除**，改为「见 `skills/domain-manager-review`」

**文件顶部加**：「相关规则：`rules/frontend.md`」

### 3.8 skills/domain-manager-dev/SKILL.md — 开发工作流（去重，273 → ~160 行）

**保留并整合**：
- §1 启动开发环境 → **删除**，改为「见 `rules/local.md` §3」
- §2 测试账号 → **删除**，改为「见 `rules/local.md` §4」
- §3 代码质量检查 → 保留（构建命令的唯一来源）
- §4 依赖管理 → 保留（pnpm + catalog 操作指南）
- §5 数据库操作 → 保留实操（与 local.md 命令互补，这里更详细）
- §6 后端 API 开发模式 → **精简**，路由模板改为「见 `skills/domain-manager-backend`」，保留挂载路由说明
- §7 前端 API 调用 → **删除**，改为「见 `skills/domain-manager-frontend`」
- §8 Provider 能力检查 → **删除**，改为「见 `rules/backend.md` §8 和 `skills/domain-manager-backend` §4」
- §9 环境变量 → **保留并扩展**（从 AGENTS.md §10 + backend.md §11 移入，**唯一来源**，含前后端 env 表）
- §10 反模式检查清单 → **删除**，改为「见 `rules/project.md`」

**新增**：
- 代码变更工作流（从 AGENTS.md §11 移入：读文档→实现→质量检查→审查→提交）

### 3.9 skills/domain-manager-debug/SKILL.md — 调试指南（轻度去重，318 → ~270 行）

**保留**（大部分是独有内容）：
- §1 调试第一步 → 保留
- §2 常见前端问题 → 保留
- §3 常见后端问题 → 保留
- §4 日志查看 → 保留
- §5 快速修复速查表 → 保留
- §6 API 响应调试 → 保留
- §7 Provider 第三方集成调试 → 保留
- §8 表单验证调试 → 保留
- §9 生产构建错误排查 → 保留
- §10 调试后清理清单 → **精简**，改为「见 `skills/domain-manager-review`」+ 保留删除临时日志条目

### 3.10 skills/domain-manager-review/SKILL.md — 审查清单（成为清单唯一来源，301 → ~200 行）

**保留并整合为唯一来源**：
- §1 通用审查要点 → 保留
- §2 前端审查要点 → 保留
- §3 后端审查要点 → 保留
- §4 常见反模式示例 → **保留并扩展**（从 AGENTS.md §12 + project.md 反模式条目对应的代码示例移入，**反模式代码示例的唯一来源**）
- §5 目录与文件命名检查 → 保留
- §6 审查反馈格式 → 保留
- §7 自我审查快速清单 → **保留为唯一清单**（其他文件的清单都删除，指向这里）

---

## 四、SSOT（单一事实来源）最终映射表

| 信息 | 唯一来源文件 | 其他文件如何处理 |
|------|------------|----------------|
| 分层架构规则 | `rules/backend.md` §2 | skills 链接引用 |
| 分层架构代码模板 | `skills/domain-manager-backend` §3 | — |
| ProviderFeatures 矩阵 | `rules/backend.md` §8 | skills 链接引用 |
| ProviderFeatures 用法代码 | `skills/domain-manager-backend` §4 | — |
| API 响应格式规则 | `rules/project.md` §4 | rules/backend.md 删除，skills 链接 |
| API 响应用法代码 | `skills/domain-manager-backend` §6 | — |
| react-hook-form 规则 | `rules/frontend.md` §2 | skills 链接引用 |
| 表单代码模板 | `skills/domain-manager-frontend` §4 | rules/frontend.md 删除代码 |
| userId 隔离规则 | `rules/backend.md` §6 | skills 链接引用 |
| userId 隔离代码 | `skills/domain-manager-backend` §8 | — |
| 反模式条目 | `rules/project.md`（新增节） | 其他 rules 文件删除清单 |
| 反模式代码示例 | `skills/domain-manager-review` §4 | AGENTS.md 删除 |
| 命令速查 | `rules/local.md` §3 | AGENTS.md/dev skill 链接 |
| 测试账号 | `rules/local.md` §4 | AGENTS.md/dev skill 链接 |
| 环境变量 | `skills/domain-manager-dev` §9 | AGENTS.md/backend.md 删除 |
| 目录结构（顶层） | `AGENTS.md` | — |
| 后端目录结构（细节） | `skills/domain-manager-backend` §2 | rules/backend.md 删除 |
| 前端目录结构（细节） | `skills/domain-manager-frontend` §3 | — |
| 数据库模型速查 | `skills/domain-manager-backend`（新增节） | AGENTS.md 删除 |
| 核心能力表 | `rules/project.md`（新增节） | AGENTS.md 删除 |
| 审查/自检清单 | `skills/domain-manager-review` §7 | 其他 skill 删除清单 |
| 代码变更工作流 | `skills/domain-manager-dev`（新增节） | AGENTS.md 删除 |

---

## 五、假设与决策

1. **假设**：当前 rules/skills 内容准确反映项目实际状态（基于探索确认）
2. **决策**：rules/ 文件允许保留速查表（如技术栈表、能力矩阵表、命名表），但删除「教学性代码块」
3. **决策**：skills/ 文件顶部统一加「相关规则：`rules/xxx.md`」链接
4. **决策**：被删除的清单/模板，统一用「见 `xxx`」一行引用替代，保持可追溯
5. **决策**：不动 `skills-lock.json`（不存在，AGENTS.md 中提及但实际无此文件 — 顺带修正 AGENTS.md）
6. **不涉及**：不修改任何 `packages/` 下的源代码，仅优化文档

---

## 六、验证步骤

1. **内容完整性检查**：逐项核对 SSOT 映射表，确认每条信息有且仅有一个来源
2. **链接有效性**：所有「见 `xxx`」引用的文件/章节确实存在
3. **行数对比**：总行数应从 ~3000 行降至 ~1700 行（减少 ~40%）
4. **无遗漏检查**：对照原 AGENTS.md 13 个章节，确认每章内容都有归宿
5. **一致性检查**：
   - React Router 8.x（非 react-router-dom）— 全文一致
   - 通知渠道含 Telegram/Feishu（非 SMS）— 全文一致
   - Provider 列表含 gleam — 全文一致
6. **lint 验证**：文档为 .md，无需 lint/typecheck
7. **人工抽查**：随机选 3 条规则，确认只在一个文件中定义
