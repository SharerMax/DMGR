# 验证计划：rules / skills / AGENTS.md 优化成果

> 本计划用于验证上一轮「按不同职责优化 rules skills AGENTS.md」的执行成果，并修复验证中发现的少量一致性问题。

---

## 一、当前状态分析（Phase 1 探索结果）

经读取全部 10 个文档文件，确认上一轮重写已基本完成：

| 文件 | 当前行数 | 状态 |
|------|---------|------|
| `AGENTS.md` | 76 | ✅ 纯导航枢纽（决策树 + 目录结构 + 文件速查表） |
| `.trae/rules/project.md` | 144 | ✅ 声明式规则，含 §11 反模式清单（全局唯一来源） |
| `.trae/rules/backend.md` | 148 | ✅ 声明式规则，含 §8 ProviderFeatures 矩阵（唯一来源） |
| `.trae/rules/frontend.md` | 172 | ✅ 声明式规则，含 React Router 8.x 说明 |
| `.trae/rules/local.md` | 165 | ✅ 环境配置，§3 标题已修复 |
| `.trae/skills/domain-manager-backend/SKILL.md` | 493 | ✅ 含「相关规则」头部 + CRUD 模板 + DB 模型速查表 |
| `.trae/skills/domain-manager-frontend/SKILL.md` | 575 | ✅ 含「相关规则」头部 + 表单/Store 模板 |
| `.trae/skills/domain-manager-dev/SKILL.md` | 146 | ✅ 含「相关规则」头部 + 环境变量唯一来源 |
| `.trae/skills/domain-manager-debug/SKILL.md` | 316 | ✅ 含「相关规则」头部 + 清理链接到 review §7 |
| `.trae/skills/domain-manager-review/SKILL.md` | 304 | ✅ 审查清单 + 反模式代码示例唯一来源 |

**总行数**：约 2539 行（原 ~3700 行，减少 ~32%）

---

## 二、SSOT 验证结果（已通过）

通过 Grep 验证以下关键信息的唯一来源：

| 信息项 | 唯一来源文件 | 验证结果 |
|--------|------------|---------|
| ProviderFeatures 能力矩阵 | `rules/backend.md` §8 | ✅ 仅 1 处定义 |
| 反模式条目清单 | `rules/project.md` §11 | ✅ 仅 1 处定义 |
| 反模式代码示例 | `skills/domain-manager-review` §4 | ✅ 仅 1 处定义 |
| 统一 API 响应格式 | `rules/project.md` §5 | ✅ 仅 1 处定义 |
| 数据库模型速查表 | `skills/domain-manager-backend` §11 | ✅ 仅 1 处定义 |
| 环境变量清单 | `skills/domain-manager-dev` §7 | ✅ 仅 1 处定义 |

**交叉引用验证**：所有「见 `xxx` §N」引用（共 20+ 处）均指向存在的文件与章节。

**一致性验证**：
- ✅ `react-router-dom` 在 3 个文档中均以「禁用」语境出现（非重复定义）
- ✅ rules/ 和 skills/ 文件中无 SMS/短信引用（仅在 README.md/README.en.md 中存在，属范围外）
- ✅ ProviderFeatures 矩阵含 gleam
- ✅ 通知渠道为 Telegram / Feishu

---

## 三、发现的问题（需修复）

### 问题 1：前端 Skill 的 Select 模板缺少 gleam 选项

**位置**：`.trae/skills/domain-manager-frontend/SKILL.md` §4.2（约第 205-211 行）

**现状**：Select 模板的 `SelectItem` 列表为 aliyun / tencent / cloudflare / dnspod / namecheap / vps8，**缺少 gleam**。

**对比**：`rules/backend.md` §8 的 ProviderFeatures 矩阵列出了 7 个服务商（含 gleam），`skills/domain-manager-backend` §2 目录结构也包含 `gleam/`。

**影响**：模板示例与规则中的服务商清单不一致，可能误导开发者遗漏 gleam 选项。

---

## 四、修复方案

### 修复 1：在 frontend Skill §4.2 Select 模板中补充 gleam 选项

**文件**：`d:\code\nodejs\DMGR\.trae\skills\domain-manager-frontend\SKILL.md`

**修改位置**：§4.2 的 `<SelectContent>` 块内，在 `vps8` 之后添加：

```tsx
<SelectItem value="gleam">Gleam</SelectItem>
```

**原因**：与 `rules/backend.md` §8 的 7 个服务商清单保持一致。

---

## 五、验证步骤

修复完成后执行以下检查：

1. **一致性复查**：`grep -n "gleam" .trae/skills/domain-manager-frontend/SKILL.md` 应能匹配到新增的 SelectItem
2. **SSOT 完整性**：确认 ProviderFeatures 矩阵仍仅在 `rules/backend.md` §8 定义
3. **交叉引用有效性**：确认所有「见 `xxx`」链接仍指向存在章节
4. **无遗漏**：确认 7 个服务商（aliyun / tencent / cloudflare / dnspod / namecheap / vps8 / gleam）在以下位置一致出现：
   - `rules/backend.md` §8 矩阵
   - `skills/domain-manager-backend` §2 目录结构
   - `skills/domain-manager-frontend` §4.2 Select 模板
   - `skills/domain-manager-debug` §7 Provider 集成调试

---

## 六、假设与决策

- **假设**：上一轮重写已正确建立三层文档架构（AGENTS.md 导航 → rules/ 声明式 → skills/ 模板），无需重新设计结构
- **决策**：仅修复验证中发现的一致性问题（gleam 缺失），不扩大改动范围
- **范围外**：README.md / README.en.md 中的 SMS 引用不在本次优化范围内（用户原始请求仅涉及 rules / skills / AGENTS.md）
