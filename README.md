# Domain Manager

> 域名管理系统 — 一站式域名、DNS 记录、自动续期与到期提醒管理平台
>
> [English](./README.en.md) | 中文

## 项目介绍

Domain Manager 是一个基于 React + Express + Prisma + SQLite 构建的域名管理系统，支持多 DNS 服务商对接、DNS 记录同步管理、域名自动续期、到期提醒通知等功能。

## 主要功能

- **域名管理**：多服务商域名统一管理，支持到期提醒
- **DNS 记录管理**：增删改查 DNS 记录，自动同步到服务商
- **服务商对接**：支持阿里云、腾讯云、Cloudflare、DNSPod、Namecheap、VPS8、Gleam 等
- **自动续期**：支持域名自动续期，可配置 cron 定时任务
- **通知提醒**：支持多渠道通知（Email、Telegram、飞书、Webhook），到期自动提醒
- **续期日志**：完整的续期操作日志，可追溯历史记录

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS + Zustand |
| 后端 | Express 5 + Prisma ORM + SQLite + Zod 4 + Pino |
| 包管理 | pnpm monorepo + catalog 统一依赖版本 |
| 认证 | JWT（Bearer Token） |

## 项目结构

```
domain/
├── packages/
│   ├── client/          # 前端（React + Vite）
│   │   └── src/
│   │       ├── pages/       # 页面组件
│   │       ├── stores/      # Zustand 状态管理
│   │       ├── components/  # 组件（ui/ 为 shadcn/ui）
│   │       ├── lib/         # API 客户端 & 工具函数
│   │       └── hooks/       # 自定义 Hooks
│   └── server/          # 后端（Express + Prisma）
│       └── src/
│           ├── routes/      # API 路由（控制器层）
│           ├── services/    # 业务服务层
│           ├── models/      # 数据访问层
│           ├── providers/   # DNS 服务商适配层
│           ├── notifications/ # 通知渠道适配层（email/telegram/feishu/webhook）
│           ├── middleware/  # 中间件
│           ├── prisma/      # Prisma schema & 迁移
│           ├── db/          # 数据库初始化
│           └── utils/       # 工具函数
├── pnpm-workspace.yaml  # 工作区 & catalog 配置
└── package.json
```

## 快速开始

### 环境要求

- Node.js >= 22.21
- pnpm >= 11

### 安装依赖

```bash
pnpm install
```

### 初始化数据库

```bash
cd packages/server
pnpm prisma migrate dev
pnpm prisma db seed
```

### 启动开发服务

```bash
# 启动后端（http://localhost:3001）
pnpm dev:server

# 启动前端（http://localhost:3000）
pnpm dev:client
```

### 构建

```bash
pnpm build
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 后端服务端口 |
| `JWT_SECRET` | - | JWT 密钥（生产环境必须设置） |
| `LOG_LEVEL` | `info` | 日志级别 |
| `LOG_DIR` | `./logs` | 日志文件目录（生产环境） |
| `RENEWAL_CRON_EXPRESSION` | `0 2 * * *` | 自动续期 cron 表达式 |
| `DATABASE_URL` | `file:./dev.db` | SQLite 数据库文件路径 |
| `SMTP_HOST` | - | SMTP 服务器地址（Email 通知渠道必填） |
| `SMTP_PORT` | `465` | SMTP 端口（465 SSL / 587 STARTTLS） |
| `SMTP_USER` | - | SMTP 用户名（Email 通知渠道必填） |
| `SMTP_PASS` | - | SMTP 密码 / 授权码（Email 通知渠道必填） |
| `SMTP_FROM` | - | 发件人地址（Email 通知渠道必填） |

## 测试账号

- 用户名：`admin` / 密码：`password123`
- 邮箱：`admin@example.com` / 密码：`password123`

## API 接口

所有接口统一返回格式：

```json
{
  "code": 0,
  "message": "操作成功",
  "data": {}
}
```

主要接口：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 获取当前用户 |
| GET | `/api/domains` | 域名列表 |
| POST | `/api/domains` | 创建域名 |
| PUT | `/api/domains/:id` | 更新域名 |
| DELETE | `/api/domains/:id` | 删除域名 |
| GET | `/api/providers` | 服务商列表 |
| GET | `/api/dns-records` | DNS 记录列表 |
| GET | `/api/renewal-logs` | 续期日志 |
| GET | `/api/renewal-logs/config` | 自动续期配置 |
| PUT | `/api/renewal-logs/config` | 更新自动续期配置 |
| POST | `/api/renewal-logs/trigger` | 手动触发续期 |
| GET | `/api/notification-channels` | 通知渠道列表 |
| GET | `/api/sync-logs` | 服务商域名同步审计日志 |

## 开发约定

1. 使用 `pnpm` 作为包管理器，依赖通过 catalog 统一管理
2. 代码变更后：格式化 → 构建 → 类型检查
3. 后端分层架构：`routes → services → models → db/prisma`，禁止跨层调用
4. 路由层只能调用 services/，禁止直接导入 models/ 或 prisma
5. 通配路由 `/:id` 必须放在所有具体路径路由之后
6. 后端统一响应格式：`{ code, message, data }`
7. 后端统一日志：使用 Pino logger，禁止 `console.*`
8. 生产环境日志写入文件（rotating-file-stream，按天轮转，保留 30 天）

## 许可证

MIT
