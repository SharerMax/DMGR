---
name: "domain-manager-backend"
description: "Backend development for Domain Manager Express server. Invoke when working on API routes, models, DNS providers, services, or database schema in packages/server."
---

# Domain Manager Backend

Express + Prisma + SQLite + JWT + Zod

## 目录结构

```
packages/server/src/
├── index.ts             # 服务器入口（路由注册、中间件）
├── db/index.ts          # Prisma Client 初始化
├── prisma/
│   ├── schema.prisma    # 数据模型（注意路径是 src/prisma/）
│   ├── seed.ts          # 种子数据
│   ├── generated/       # Prisma Client 输出
│   └── migrations/
├── models/              # 业务模型（含 authMiddleware）
├── routes/              # API 路由
│   ├── auth.ts          # /api/auth
│   ├── domains.ts       # /api/domains
│   ├── providers.ts     # /api/providers
│   ├── notificationChannels.ts  # /api/notification-channels
│   ├── dnsRecords.ts    # /api/dns-records
│   └── renewalLogs.ts   # /api/renewal-logs
├── services/
│   ├── autoRenew.ts     # 自动续期服务
│   └── notification.ts  # 通知服务
└── providers/           # DNS 服务商抽象
    ├── base.ts          # 抽象基类
    ├── providers.ts     # 内置服务商配置
    ├── aliyun.ts        # 阿里云实现
    └── aliyun-syncer.ts # 阿里云域名同步
```

## 数据模型关系

```
User ─┬─> Provider ──> Domain
      ├─> Domain ─┬─> Reminder
      │           ├─> DNSRecord
      │           ├─> RenewalLog
      │           └─> NotificationLog
      ├─> NotificationChannel
      └─> NotificationLog
```

关键字段:
- Domain: `autoRenew`, `autoRenewDays`, `expiryDate`, `status`
- Provider: `config` (JSON string), `supportsAutoRenew`
- NotificationChannel: `config` (JSON string), `defaultDays`, `isActive`

## 路由开发

1. 在 `routes/` 创建路由文件
2. 用 Zod 验证输入，`authMiddleware` 保护路由
3. 在 `index.ts` 注册: `app.use('/api/xxx', xxxRoutes)`
4. 导入用 `.js` 扩展名: `import { prisma } from '../db/index.js'`

## DNS Provider 系统

服务商类型: aliyun, tencent, cloudflare, dnspod, namecheap, custom

每个 Provider 实现:
- `getDNSRecords(domain)` / `addDNSRecord(domain, record)`
- `updateDNSRecord(domain, recordId, record)` / `deleteDNSRecord(domain, recordId)`

添加新 Provider:
1. 在 `providers/` 创建类，继承抽象基类
2. 在 `providers.ts` 添加配置
3. 在工厂/注册表中注册

## 认证

- JWT Bearer token，有效期 7 天
- `authMiddleware` 验证后挂载 `req.user`
- 用户只能访问自己的数据（查询必须包含 userId 过滤）
- 登录支持用户名或邮箱（自动识别 `@` 符号）
