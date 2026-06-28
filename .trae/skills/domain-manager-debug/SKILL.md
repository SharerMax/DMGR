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
| 数据查询问题 | 从 routes → services → models 逐层排查，先确认 service 层返回是否正确 |
| 权限问题 | service 层是否做了 userId 校验？`getUserXxx` 方法是否验证所有权？ |

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

## 三方集成调试

### DNS 记录不同步
1. 检查 Pino 日志中是否有 `DNS provider error` 或 `warn` 级日志
2. 确认 Provider 配置（config JSON 字段）是否完整（accessKeyId/secretId 等）
3. 检查 `providers/<name>/provider.ts` 中方法实现是否正确映射
4. 本地操作成功但三方失败时，service 层只记 warn 不报错，需查日志

### 自动续期不执行
1. 检查 `autoRenewService.ts` 调度器是否启动（看启动日志 `Auto renewal scheduler started`）
2. 检查域名的 `autoRenew` 是否为 true，`expiryDate` 是否在续期窗口内
3. 检查 Provider 的 `supportsAutoRenew` 是否为 true
4. 检查 `providers/<name>/renewer.ts` 是否正确注册到 `DNSProviderFactory`
5. 续期结果写入 `renewalLogs` 表，可查记录看状态和错误信息

### Provider 工厂找不到实现
1. 检查 `providers/config.ts` 是否注册了该服务商
2. 检查对应服务商目录的 `index.ts` 是否调用了 `DNSProviderFactory.registerXxx`
3. 检查 `providers/index.ts` 是否导入了该服务商模块（触发注册）
4. 类型名拼写是否一致（aliyun / vps8 / cloudflare 等）

### ApiClient 调用异常
1. 检查 `providers/<name>/apiClient.ts` 是否正确使用了对应服务商的官方 SDK（如 `@alicloud/pop-core`、`tencentcloud-sdk-nodejs-*`、`cloudflare`），或正确拼接了认证参数（如 DNSPod Login Token、Namecheap HMAC-SHA1 + Timestamp + ClientIp）
2. 检查 `provider.ts` / `syncer.ts` / `renewer.ts` 是否直接从 `./apiClient` 导入并实例化（**不再继承 `BaseApiClient`**）
3. 对于使用官方 SDK 的服务商（aliyun / tencent / cloudflare），签名由 SDK 内部处理；如报签名错误，先确认 AccessKey / SecretId / Token 本身是否正确
4. 对于手写签名的服务商（namecheap / vps8 / dnspod），核对签名算法、参数排序、时间戳、nonce 等
5. 可在 apiClient 方法中加 logger 输出实际请求参数和响应 body
