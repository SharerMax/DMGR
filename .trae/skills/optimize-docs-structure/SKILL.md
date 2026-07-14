---
name: "optimize-docs-structure"
description: "Optimizes project docs (rules/skills/AGENTS.md) by responsibility layers and SSOT. Invoke when user asks to optimize/refactor documentation structure, eliminate duplication across rules/skills, or reorganize AGENTS.md."
---

# 文档结构优化 Skill

> 面向 AI Agent 的项目文档结构优化方法论。当用户要求「优化 rules/skills/AGENTS.md」「按职责整理文档」「消除文档重复」「重构文档结构」时，按本 skill 执行。
> **核心目标**：高效、准确、简单 —— 通过三层职责分层 + SSOT（单一信息来源）原则，消除跨文件重复，让每条信息有且仅有一个归宿。

---

## 1. 三层文档架构原则

优化后的文档必须遵循以下三层职责分层：

| 层 | 文件 | 职责 | 内容特征 |
|----|------|------|---------|
| **导航层** | `AGENTS.md` | 纯导航枢纽 | 决策树（任务→文件映射）+ 目录结构 + 文件速查表，**无具体规则内容** |
| **规则层** | `.trae/rules/*.md` | 声明式规则（「必须 / 禁止」） | **无代码模板**，只写规则条目，模板指向 skills/ |
| **技能层** | `.trae/skills/<name>/SKILL.md` | 操作指南 + 代码模板 | 开头写「相关规则见 `rules/xxx.md`」，**不重复规则条目**，只写操作步骤和代码 |

**关键边界**：
- `rules/` 和 `skills/` 的区分：rules 写「是什么/必须怎样」（声明式），skills 写「怎么做」（含代码）
- 如果两者冲突，以 `rules/` 为准
- 每条信息只在唯一来源文件中定义，其他文件通过「见 `xxx` §N」链接引用

---

## 2. AGENTS.md 导航枢纽标准结构

优化后的 `AGENTS.md` 应精简为 **~80 行以内**，只包含以下 4 个部分：

### 2.1 项目简介（2-3 句话）
```markdown
# AGENTS.md — 项目名 项目指南
> **项目名** — 一句话描述。
> 后端：技术栈；前端：技术栈。Monorepo：结构。
```

### 2.2 快速决策路径（决策树）
```markdown
## 快速决策路径（开始前必读）
根据你的任务类型，按以下路径找到对应的规范与技能文档：
（用 ASCII 决策树列出 任务类型 → 必读文件）
```

### 2.3 顶层目录结构
```markdown
## 顶层目录结构
（只列 .trae/ 和 packages/ 的两级结构 + 每个文件的一句话说明）
```

### 2.4 文件速查表
```markdown
## 文件速查表
| 文件 | 职责 | 内容类型 |
（列出所有 rules/ 和 skills/ 文件，3 列：路径、职责、内容类型）
```

**禁止**：在 AGENTS.md 中重复 rules/ 或 skills/ 的具体规则内容。

---

## 3. SSOT（单一信息来源）方法论

### 3.1 识别重复信息

通读全部文档，标记在多个文件中重复出现的信息。常见重复类型：

| 重复类型 | 举例 |
|---------|------|
| 规则重复 | 「分层架构职责表」同时出现在 project.md、backend.md、skills |
| 矩阵重复 | 「能力矩阵」「技术栈表」在多个文件复制粘贴 |
| 清单重复 | 「反模式检查清单」在 5+ 个文件各写一遍 |
| 命令重复 | 「pnpm 命令」在 local.md、dev skill、AGENTS.md 各列一遍 |

### 3.2 分配唯一来源

为每条信息指定**唯一来源文件**，其他文件改为链接引用。分配原则：

| 信息类型 | 唯一来源位置 | 理由 |
|---------|------------|------|
| 项目级通用规则（提交、命名、安全） | `rules/project.md` | 全局适用 |
| 领域专属规则（前端/后端/本地） | `rules/<domain>.md` | 按领域隔离 |
| 能力矩阵、技术栈速查表 | `rules/<domain>.md` | 属于该领域的声明 |
| 反模式条目清单 | `rules/project.md` §11 | 全局唯一 |
| 反模式代码示例 | `skills/domain-manager-review` §4 | 代码模板归 skills |
| 数据库模型速查表 | `skills/domain-manager-backend` | 代码参考归 skills |
| 环境变量清单 | `skills/domain-manager-dev` | 操作配置归 skills |
| CRUD/表单/Store 代码模板 | `skills/<domain>` | 操作模板归 skills |

### 3.3 建立交叉引用

非来源文件中，用以下格式链接到来源：

```markdown
规则见 `rules/backend.md` §2。以下是代码模板。
模板见 `skills/domain-manager-frontend` §4。
代码审查与自检清单见 `skills/domain-manager-review`。
```

**规则**：
- skills/ 文件开头必须写 `> **相关规则**：rules/xxx.md, rules/yyy.md`
- skills/ 每个含代码的章节开头写 `规则见 rules/xxx.md §N。以下是代码模板。`
- rules/ 中提到模板时写 `模板见 skills/xxx §N`

---

## 4. 优化执行流程

### Step 1: 探索现状（只读）

1. 用 `LS` 列出 `.trae/rules/` 和 `.trae/skills/` 下所有文件
2. 用 `Read` 读取全部文档文件（AGENTS.md + 所有 rules + 所有 skills）
3. 记录每个文件的行数和主要内容
4. 用 `Grep` 搜索关键信息（如「分层架构」「反模式」「能力矩阵」）统计重复出现位置

### Step 2: 诊断重复

建立 SSOT 映射表（可写入 `.trae/documents/` 作为计划文件）：

```markdown
| 信息项 | 重复出现的文件 | 唯一来源（目标） | 其他文件处理 |
|--------|-------------|----------------|------------|
| 分层架构职责表 | project/backend/skills | rules/backend.md §2 | project.md 改为链接，skills 改为链接 |
| ... | ... | ... | ... |
```

### Step 3: 重写文件（按顺序）

推荐重写顺序（先规则后技能，先底层后上层）：

1. **rules/project.md** — 全局规则 + 反模式清单 SSOT
2. **rules/backend.md** / **rules/frontend.md** — 领域规则，删除代码模板
3. **rules/local.md** — 环境配置（通常改动小）
4. **skills/domain-manager-backend** — 加「相关规则」头部，保留代码模板
5. **skills/domain-manager-frontend** — 同上
6. **skills/domain-manager-dev** — 加「相关规则」头部，环境变量 SSOT
7. **skills/domain-manager-debug** — 加「相关规则」头部
8. **skills/domain-manager-review** — 反模式代码示例 SSOT
9. **AGENTS.md** — 最后重写为纯导航枢纽（此时所有内容已有归宿）

### Step 4: 验证（只读）

用 Grep 验证以下 5 项：

```bash
# 1. SSOT 完整性：关键信息应只在唯一来源定义
#    例：ProviderFeatures 矩阵应只在 rules/backend.md
grep -l "aliyun.*✅.*✅.*✅" .trae/rules/ .trae/skills/

# 2. 反模式清单应只在 rules/project.md
grep -l "反模式清单（全局唯一来源）" .trae/

# 3. 交叉引用有效性：所有「见 `xxx`」指向存在的文件
grep -n "见 \`rules\.\|见 \`skills/" .trae/

# 4. 一致性：关键术语全文统一
#    - 检查 react-router-dom 均为「禁用」语境
#    - 检查通知渠道一致（Email / Telegram / Feishu / Webhook，无已移除的 SMS）
#    - 检查 provider 列表一致（含所有服务商如 gleam）

# 5. 行数对比：总行数应显著减少（目标减少 30%+）
```

---

## 5. rules/ 文件改造标准

### 5.1 头部声明

每个 rules 文件开头必须声明自己是声明式规则：

```markdown
# <领域>开发规范
> 适用于 <范围>。核心技术栈：<技术栈>。
> 本文件为**声明式规则**（「必须 / 禁止」），不含代码模板。模板见 `skills/<name>`。
```

### 5.2 内容要求

- ✅ 只写「必须 / 禁止」条目
- ✅ 保留表格（技术栈速查、能力矩阵、Store 清单等）
- ✅ 保留规则速查表（如 Zod 验证规则、组件使用模式）
- ❌ 删除所有代码块（```typescript / ```tsx）
- ❌ 删除 CRUD/表单/Store 完整模板
- ✅ 提到模板时写「模板见 `skills/xxx` §N」

### 5.3 反模式清单（全局唯一）

`rules/project.md` 的反模式清单是**全局唯一来源**，使用表格格式：

```markdown
## 11. 反模式清单（全局唯一来源）
以下模式在本项目中是**禁止的**（代码示例见 `skills/domain-manager-review` §4）：
| ❌ 禁止 | ✅ 正确做法 |
|--------|------------|
| 后端 import 不带 `.js` 扩展名 | `import { xxx } from '@/utils/index.js'` |
```

其他文件的反模式检查清单**全部删除**，改为「见 `rules/project.md` §11」或「见 `skills/domain-manager-review`」。

---

## 6. skills/ 文件改造标准

### 6.1 头部声明

每个 skill 文件开头必须声明相关规则：

```markdown
# <领域> Skill
> 面向 AI Agent 的<领域>操作指南。<触发条件>
> **相关规则**：`rules/xxx.md`、`rules/yyy.md`。本文件只提供操作步骤和代码模板，不重复规则条目。
```

### 6.2 内容要求

- ✅ 保留所有代码模板（CRUD、表单、Store、Zod 等）
- ✅ 保留目录结构（作为该领域细节的唯一来源）
- ✅ 每个含代码的章节开头写「规则见 `rules/xxx.md` §N。以下是代码模板。」
- ❌ 删除重复的规则条目（改为链接）
- ❌ 删除重复的检查清单（改为「见 `skills/domain-manager-review`」）

### 6.3 结尾

skills 文件结尾的检查清单统一改为：

```markdown
## N. 提交前检查
代码审查与自检清单见 `skills/domain-manager-review`。
```

---

## 7. 一致性检查清单

优化完成后，必须确认以下关键信息在全文一致：

| 检查项 | 验证方法 |
|--------|---------|
| 路由库 | `react-router-dom` 均为「禁用」语境，React Router 8.x 从 `react-router` 导入 |
| 通知渠道 | 全文为 Email / Telegram / Feishu / Webhook，无已移除的 SMS/短信（rules/ 和 skills/ 范围内） |
| Provider 列表 | 7 个服务商（aliyun/tencent/cloudflare/dnspod/namecheap/vps8/gleam）在矩阵、目录结构、Select 模板、调试章节中一致出现 |
| 技术栈版本 | Node >= 22.21、pnpm >= 11.9、TypeScript 6.x、Express 5.2、Zod 4.4、Pino 10.3 |
| `@types/node` | 固定 `^22.20.0`，不升级到 v26+ |

---

## 8. 何时调用本 Skill

- 用户要求「优化 rules/skills/AGENTS.md」
- 用户要求「按职责整理文档」「消除文档重复」
- 用户要求「重构文档结构」「精简文档」
- 文档出现明显的跨文件内容重复
- 新增 rules/skills 文件后需要重新对齐 SSOT 结构
- 定期文档健康度审查（建议每季度一次）

---

## 9. 输出物

优化完成后应产出：

1. **优化后的全部文档**（AGENTS.md + rules/*.md + skills/*/SKILL.md）
2. **计划文件**（可选，存于 `.trae/documents/`）：记录 SSOT 映射表和改动清单
3. **验证报告**（可选）：记录 Grep 验证结果和行数对比

---

## 10. 反模式（本 Skill 自身需避免）

- ❌ 在 AGENTS.md 中保留具体规则内容（应纯导航）
- ❌ 在 rules/ 中保留代码模板（应只声明式）
- ❌ 在 skills/ 中重复 rules/ 的规则条目（应链接引用）
- ❌ 同一信息在多个文件定义（违反 SSOT）
- ❌ 交叉引用指向不存在的章节（链接失效）
- ❌ 优化后未运行 Grep 验证（一致性未检查）
