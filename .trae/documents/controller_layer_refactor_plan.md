# 后端分层架构重构计划

## 问题分析

根据 [backend.md](file:///d:/code/nodejs/DMGR/.trae/rules/backend.md) 的分层架构要求：

| 层级 | 目录 | 职责 |
|------|------|------|
| 控制器层 | `routes/` | 接收请求、参数校验、调用**业务层**、返回响应 |
| 业务层 | `services/` | 处理业务逻辑，调用**数据访问层** |
| 数据访问层 | `models/` | 数据库 CRUD 封装 |

**当前问题**：控制器层（`routes/`）直接访问数据访问层（`models/` 和 `prisma`），跳过了业务服务层。

### 直接访问数据层的路由

| 路由文件 | 直接访问的数据层 | 严重程度 |
|----------|-----------------|----------|
| `routes/auth.ts` | `models/user.ts` | 中 |
| `routes/domains.ts` | `models/domain.ts` + `models/reminder.ts` | 中 |
| `routes/providers.ts` | `models/provider.ts` + `models/domain.ts` | 中 |
| `routes/dnsRecords.ts` | `models/dnsRecord.ts` + `models/domain.ts` | 中 |
| `routes/notificationChannels.ts` | `models/notificationChannel.ts` | 中 |
| `routes/renewalLogs.ts` | 直接使用 `prisma` | **高**（绕过了整个 models 层） |

## 重构目标

1. 新增业务服务层，routes 只调用 services
2. renewalLogs 路由的 prisma 直接调用封装到 service 层
3. 保持 models/ 作为纯数据访问层（CRUD 封装）
4. 保持 providers/ 作为适配/集成层不变

## 新增文件

### 业务服务层 (`services/`)

| 文件 | 职责 | 封装的业务逻辑 |
|------|------|---------------|
| `services/userService.ts` | 用户相关业务 | 注册、登录校验、资料更新、密码修改 |
| `services/domainService.ts` | 域名相关业务 | 域名 CRUD、过滤查询、提醒管理、级联删除 |
| `services/providerService.ts` | 服务商相关业务 | 服务商 CRUD、配置校验、域名同步 |
| `services/dnsRecordService.ts` | DNS 记录相关业务 | DNS 记录 CRUD、权限校验 |
| `services/notificationChannelService.ts` | 通知渠道相关业务 | 渠道 CRUD、配置解析 |
| `services/renewalLogService.ts` | 续期日志相关业务 | 日志查询、分页、统计、自动续期配置 |

### 数据访问层补充 (`models/`)

| 文件 | 新增内容 |
|------|---------|
| `models/renewalLog.ts` | 续期日志 CRUD 封装（当前 renewalLogs 路由直接用 prisma） |

## 修改文件

| 文件 | 修改内容 |
|------|---------|
| `routes/auth.ts` | 导入改为 `services/userService.js`，调用 service 方法 |
| `routes/domains.ts` | 导入改为 `services/domainService.js`，调用 service 方法 |
| `routes/providers.ts` | 导入改为 `services/providerService.js`，调用 service 方法 |
| `routes/dnsRecords.ts` | 导入改为 `services/dnsRecordService.js`，调用 service 方法 |
| `routes/notificationChannels.ts` | 导入改为 `services/notificationChannelService.js`，调用 service 方法 |
| `routes/renewalLogs.ts` | 导入改为 `services/renewalLogService.js`，移除 prisma 直接引用 |
| `services/autoRenew.ts` | 保持不变（已是业务服务） |
| `services/notification.ts` | 保持不变（已是业务服务） |

## 重构步骤

### 阶段一：创建数据访问层（renewalLog）
1. 创建 `models/renewalLog.ts`，封装续期日志的 CRUD 和查询方法
2. 包含：分页查询、单条查询、统计汇总、创建日志

### 阶段二：创建业务服务层
1. 创建 `services/userService.ts` - 封装注册、登录验证、资料更新
2. 创建 `services/domainService.ts` - 封装域名 CRUD、过滤、提醒管理
3. 创建 `services/providerService.ts` - 封装服务商 CRUD、配置校验、同步
4. 创建 `services/dnsRecordService.ts` - 封装 DNS 记录 CRUD、权限校验
5. 创建 `services/notificationChannelService.ts` - 封装渠道 CRUD、配置解析
6. 创建 `services/renewalLogService.ts` - 封装日志查询、统计、续期配置管理

### 阶段三：改造路由层
1. 改造 `routes/auth.ts` - 调用 userService
2. 改造 `routes/domains.ts` - 调用 domainService
3. 改造 `routes/providers.ts` - 调用 providerService
4. 改造 `routes/dnsRecords.ts` - 调用 dnsRecordService
5. 改造 `routes/notificationChannels.ts` - 调用 notificationChannelService
6. 改造 `routes/renewalLogs.ts` - 调用 renewalLogService

### 阶段四：验证
1. 运行 typecheck
2. 运行 lint
3. 确保所有接口行为不变

## 设计原则

1. **控制器层**只做：参数校验（Zod）、调用 service、返回统一响应、记录日志
2. **业务层**做：业务逻辑处理、多表操作协调、权限校验、调用数据访问层
3. **数据访问层**只做：纯 CRUD、数据库查询封装、不包含业务逻辑
4. 每个 service 方法对应一个业务用例，函数名体现业务语义
5. service 层负责错误的业务语义包装，不直接处理 HTTP 响应

## 潜在风险

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| 重构范围大，可能引入回归 | 中 | 按模块逐步改造，每个模块完成后验证 |
| renewalLogs 逻辑复杂，直接用 prisma 的地方多 | 高 | 先建 models 层，再建 service 层，逐步替换 |
| 类型定义分散在多处 | 低 | 统一从 models/ 导出类型，service 层复用 |

## 不涉及的范围

- `providers/` 目录（适配层，保持不变）
- `services/autoRenew.ts` 和 `services/notification.ts`（已是业务服务）
- `middleware/` 目录（中间件层）
- `utils/` 目录（工具函数）
- 前端代码（不受影响）
