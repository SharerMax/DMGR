---
name: "domain-manager-git"
description: "Git workflow and best practices for Domain Manager. Invoke when user asks to commit, push, branch, or manage git operations."
---

# Domain Manager Git 规范

本项目使用 Git 进行版本控制。

## 分支策略

- **main**: 主分支，保持稳定
- **开发**: 在功能分支上开发，完成后合并

## 基本工作流

### 1. 创建功能分支

```bash
# 从 main 创建新分支
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# 或从当前分支创建
git checkout -b feature/your-feature-name
```

### 2. 开发与提交

```bash
# 查看修改状态
git status

# 查看具体修改
git diff

# 添加文件（建议添加具体文件，避免添加敏感文件）
git add src/pages/Domains.tsx
git add src/components/ui/button.tsx

# 提交（使用清晰的提交信息）
git commit -m "feat: 添加域名自动续期功能
- 支持设置自动续期阈值
- 添加服务商续期时间展示"

# 推送分支
git push -u origin feature/your-feature-name
```

### 3. 合并流程

```bash
# 切换到 main
git checkout main

# 拉取最新代码
git pull origin main

# 合并功能分支
git merge feature/your-feature-name

# 推送
git push origin main
```

## 主流 Shell 兼容性

Git 命令在不同 shell 中的语法差异：

### Bash / Zsh / Fish

```bash
# 多行提交信息（使用 HEREDOC）
git commit -m "$(cat <<'EOF'
feat: 添加新功能

- 功能描述
- 变更内容

BREAKING CHANGE: 破坏性变更说明
EOF
)"

# 或使用外部文件
git commit -F commit-message.txt
```

### PowerShell

PowerShell 不支持 HEREDOC 语法，使用 `-m` 多次叠加：

```powershell
# 多行提交信息（使用多个 -m）
git commit -m "feat: 添加新功能" `
  -m "- 功能描述" `
  -m "- 变更内容" `
  -m "" `
  -m "BREAKING CHANGE: 破坏性变更说明"

# 或使用 here-string
$msg = @"
feat: 添加新功能

- 功能描述
- 变更内容
"@
git commit -m $msg
```

## 提交信息规范

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | 说明 |
|------|------|
| feat | 新功能 |
| fix | 修复 bug |
| docs | 文档更新 |
| style | 代码格式（不影响功能） |
| refactor | 重构（不是新功能或修复） |
| perf | 性能优化 |
| test | 测试相关 |
| chore | 构建/工具相关 |

### 示例

```bash
# Bash/Zsh 多行提交（推荐）
git commit -m "feat(domains): 添加域名自动续期配置" -m "- 支持设置自动续期阈值" -m "- 添加服务商续期时间展示"

# PowerShell 多行提交
git commit -m "feat(domains): 添加域名自动续期配置" `
  -m "- 支持设置自动续期阈值" `
  -m "- 添加服务商续期时间展示"

# 修改最后一次提交
git commit --amend -m "新的提交信息"

# 带详细说明的提交
git commit -m "fix(pagination): 修复分页组件在数据少时不显示的问题" `
  -m "问题：数据量小于一页时，分页组件被隐藏" `
  -m "解决：将条件判断从 totalPages <= 1 改为 totalItems === 0"
```

## 避免的操作

### 切勿执行

- **不要** 强制推送 main/master 分支
- **不要** 提交敏感信息（.env、密钥、密码）
- **不要** 使用 `git add -A` 或 `git add .` 提交全部文件
- **不要** 提交 node_modules、dist、build 等生成文件
- **不要** 提交 .gitignore 中已忽略的文件

### 敏感文件检查

提交前确认以下文件未包含在提交中：

- `.env` 文件
- `*.db` 数据库文件
- `prisma/dev.db`
- 包含真实凭证的配置文件

## 常用命令

### 查看历史

```bash
# 查看最近 5 次提交
git log --oneline -5

# 查看分支图
git log --graph --oneline --all

# 查看某次提交的详情
git show <commit-hash>
```

### 撤销操作

```bash
# 撤销未提交的修改（工作区）
git checkout -- <file>

# 撤销已 add 的文件（暂存区）
git reset HEAD <file>

# 修改最后一次提交
git commit --amend

# 回退到指定提交（谨慎使用）
git reset --hard <commit-hash>
```

### 暂存工作

```bash
# 暂存当前工作
git stash

# 查看暂存列表
git stash list

# 恢复暂存
git stash pop

# 恢复指定暂存
git stash apply stash@{0}
```

## 安全提交检查清单

1. `git status` 检查修改的文件
2. `git diff` 确认修改内容
3. 检查是否有敏感文件被修改
4. 使用 `git add <specific-file>` 而非 `git add -A`
5. 提交信息清晰描述改动
6. 推送到远程前再次确认

## 忽略文件

项目已配置 `.gitignore`，包含：

```
node_modules/
dist/
.env
*.db
prisma/generated/
```

## 冲突处理

```bash
# 拉取最新代码时发现冲突
git pull origin main

# 解决冲突后
git add <resolved-files>
git commit -m "resolve merge conflicts"
```

## 多人协作

```bash
# 获取远程分支并切换
git checkout -b feature/xxx origin/feature/xxx

# 拉取队友的更新
git fetch origin
git merge origin/feature/xxx

# 如果有冲突，解决后提交
```