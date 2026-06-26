---
name: "domain-manager-debug"
description: "Debugs Domain Manager application issues. Invoke when user reports bugs, errors, unexpected behavior, or needs help troubleshooting problems in frontend or backend."
---

# Domain Manager Debugger

## 调试流程

1. 收集信息 → 2. 复现 → 3. 定位 → 4. 修复 → 5. 验证

## 常见问题速查

### 前端

| 问题 | 排查 |
|------|------|
| API 调用失败 | 后端是否运行？API URL 是否正确？JWT 是否过期？浏览器 Network 面板看实际错误 |
| 状态不更新 | Store action 是否调用？Zustand 状态是否正确更新？组件是否订阅了 store？ |
| 暗色模式异常 | `<html>` 是否有 `.dark` class？`stores/theme.ts` 是否初始化？localStorage 偏好？ |
| Dialog 问题 | 状态是否正确管理？`ConfirmDialog` 是否渲染？z-index 冲突？ |
| 错误消息不显示 | 是否用 `error.message` 获取错误？Axios 拦截器是否正确处理？ |

### 后端

| 问题 | 排查 |
|------|------|
| 数据库连接错误 | `pnpm prisma generate && pnpm prisma db push` |
| Prisma 错误 | `pnpm prisma studio` 查看数据，`pnpm prisma validate` 验证 schema |
| 401 未授权 | JWT token 是否发送？是否过期？`middleware/auth.ts` 的 `authMiddleware` 是否应用？ |
| Provider 同步失败 | 凭证是否正确？API 是否可达？查看 Pino 日志 |
| 接口返回格式不对 | 是否使用 `sendSuccess/sendError`？返回是否为 `{ code, message, data }` 格式？ |

## 日志查看

后端使用 Pino 日志：
- 请求日志自动输出：`[timestamp] METHOD path status duration`
- 错误日志带 `err` 字段
- 可通过 `LOG_LEVEL` 环境变量调整级别

## 诊断命令

```bash
# 前端
pnpm --filter client exec tsc --noEmit   # 类型检查
pnpm --filter client exec vite build     # 构建检查

# 后端
pnpm --filter server exec tsc --noEmit   # 类型检查
cd packages/server && pnpm prisma validate  # Schema 验证
```

## 快速修复

```bash
# 重置数据库
cd packages/server && rm prisma/dev.db && pnpm prisma migrate dev && pnpm prisma db seed

# 重装依赖（lockfile 不匹配时）
pnpm install --no-frozen-lockfile

# 清除 Vite 缓存
rm -rf packages/client/node_modules/.vite
```

## API 响应调试

后端统一返回 `{ code, message, data }`：
- `code === 0` 成功
- `code !== 0` 失败

前端 Axios 拦截器：
- 成功：自动提取 `data` 字段，`response.data` 即为实际数据
- 失败：`error.message` 即为后端返回的错误消息

调试时检查：
1. 后端返回的响应体是否符合格式
2. 前端拦截器是否正确提取
3. 错误是否被正确抛出和捕获
